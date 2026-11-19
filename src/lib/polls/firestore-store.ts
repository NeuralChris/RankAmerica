import "server-only";
import { randomInt } from "node:crypto";
import { FieldValue, Firestore, Timestamp, type DocumentData, type DocumentSnapshot } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import { acceptingVotes, type Poll } from "./model";
import { BALLOTS_PER_IP, RETENTION, type PollStore } from "./store";

/**
 * Collections (all docs carry `expireAt`, which a Firestore TTL policy uses to delete them):
 *   polls/{id}                      the poll and, once closed, its final tally and result
 *   polls/{id}/shards/{0..49}       the live tally, split across shards (see SHARDS)
 *   polls/{id}/ballots/{ballotId}   one per browser; ballotId = keyed hash of poll + voter cookie
 *   polls/{id}/limits/{ipHash}      ballots cast from one IP in this poll
 *   ratelimits/{key}                fixed-window counters (poll creation, reports)
 * Auth is Application Default Credentials (the Cloud Run runtime service account).
 */
let db: Firestore | null = null;
function firestore(): Firestore {
  if (db) return db;
  const settings = { databaseId: process.env.FIRESTORE_DATABASE || "(default)", ignoreUndefinedProperties: true };
  // Local development only: FIRESTORE_DEV_ACCESS_TOKEN (from `gcloud auth print-access-token`) lets the
  // dev server reach a Firestore database without changing this machine's default credentials.
  const devToken = process.env.NODE_ENV === "development" ? process.env.FIRESTORE_DEV_ACCESS_TOKEN : undefined;
  if (devToken) {
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: devToken });
    return (db = new Firestore({ ...settings, projectId: process.env.FIRESTORE_PROJECT || "ranked-choice-515101", authClient }));
  }
  return (db = new Firestore(settings));
}
const polls = () => firestore().collection("polls");

/**
 * Each vote adds to one of SHARDS tally documents chosen at random, instead of the poll document.
 * Firestore sustains roughly one write per second per document, so a single tally document caps a
 * poll at ~15 votes/second; spreading writes over 50 shards lifts that well past 100. Reading the
 * full tally means summing the shards (one query), which the results page caches.
 */
const SHARDS = 50;
type Tally = { tally: Record<string, number>; ballots: number };
/** Adds shard tallies to whatever the poll document holds (its final tally, or a pre-sharding tally). */
function sumTally(base: { tally?: Record<string, number>; ballotCount?: number } | undefined, shards: DocumentData[]): Tally {
  const tally: Record<string, number> = { ...(base?.tally ?? {}) };
  let ballots = base?.ballotCount ?? 0;
  for (const d of shards) {
    for (const [key, n] of Object.entries((d.tally ?? {}) as Record<string, number>)) tally[key] = (tally[key] ?? 0) + n;
    ballots += d.count ?? 0;
  }
  return { tally, ballots };
}
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));
const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate() : new Date(String(t))).toISOString();
const later = (fromMs: number, ms: number) => Timestamp.fromMillis(fromMs + ms);

function toPoll(snap: DocumentSnapshot): Poll | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id, question: d.question, options: d.options, closesAt: iso(d.closesAt), createdAt: iso(d.createdAt),
    status: d.status, resultsVisibility: d.resultsVisibility, timeZone: d.timeZone, ballotCount: d.ballotCount ?? 0,
    result: d.result ?? null, creatorEmail: d.creatorEmail, manageKeyHash: d.manageKeyHash, tally: d.tally ?? {}, notified: d.notified ?? false,
  };
}

export function firestoreStore(): PollStore {
  return {
    async create(p) {
      const doc: DocumentData = { ...p, closesAt: ts(p.closesAt), createdAt: ts(p.createdAt), expireAt: later(Date.now(), RETENTION.pendingMs) };
      await polls().doc(p.id).create(doc);
    },

    async get(id) { return toPoll(await polls().doc(id).get()); },

    async publish(id) {
      return firestore().runTransaction(async tx => {
        const ref = polls().doc(id), p = toPoll(await tx.get(ref));
        if (!p || p.status !== "pending") return false;
        tx.update(ref, { status: "open", expireAt: later(Date.parse(p.closesAt), RETENTION.afterCloseMs) });
        return true;
      });
    },

    async vote({ pollId, ballotId, key, ipHash, notifyEmail }) {
      return firestore().runTransaction(async tx => {
        const ref = polls().doc(pollId), bRef = ref.collection("ballots").doc(ballotId), lRef = ref.collection("limits").doc(ipHash);
        const [pSnap, bSnap, lSnap] = await tx.getAll(ref, bRef, lRef);
        const p = toPoll(pSnap);
        if (!p || p.status === "pending" || p.status === "removed") return "not_found";
        if (!acceptingVotes(p)) return "closed";
        if (bSnap.exists) return "duplicate";
        if ((lSnap.data()?.count ?? 0) >= BALLOTS_PER_IP) return "rate_limited";
        const expireAt = later(Date.parse(p.closesAt), RETENTION.afterCloseMs);
        tx.create(bRef, { key, createdAt: FieldValue.serverTimestamp(), notify: Boolean(notifyEmail), notifyEmail: notifyEmail ?? null, expireAt });
        tx.set(lRef, { count: FieldValue.increment(1), expireAt }, { merge: true });
        // The poll document is only read here (shared lock), never written, so votes don't queue on it.
        // Closing the poll writes it, which makes in-flight votes finish first: no ballot slips past the count.
        const shard = ref.collection("shards").doc(String(randomInt(SHARDS)));
        tx.set(shard, { tally: { [key]: FieldValue.increment(1) }, count: FieldValue.increment(1), expireAt }, { merge: true });
        return "ok";
      });
    },

    async hasVoted(pollId, ballotId) { return (await polls().doc(pollId).collection("ballots").doc(ballotId).get()).exists; },

    async tally(id) {
      const ref = polls().doc(id);
      const [snap, shards] = await Promise.all([ref.get(), ref.collection("shards").get()]);
      return sumTally(snap.data(), shards.docs.map(d => d.data()));
    },

    async close(id, compute, opts) {
      return firestore().runTransaction(async tx => {
        const ref = polls().doc(id), snap = await tx.get(ref), p = toPoll(snap);
        if (!p || p.status !== "open" || (!opts?.force && Date.parse(p.closesAt) > Date.now())) return null;
        // Reading the shards inside the transaction gives a consistent final count.
        const shards = await tx.get(ref.collection("shards"));
        const { tally, ballots } = sumTally(snap.data(), shards.docs.map(d => d.data()));
        const counted = { ...p, tally, ballotCount: ballots };
        const result = compute(counted);
        // The final tally moves onto the poll document; the shards are then redundant and deleted.
        tx.update(ref, { status: "closed", result, tally, ballotCount: ballots, notified: false, expireAt: later(Date.now(), RETENTION.afterCloseMs) });
        for (const d of shards.docs) tx.delete(d.ref);
        return { ...counted, status: "closed" as const, result, notified: false };
      });
    },

    async dueForClosing(now) {
      const snap = await polls().where("status", "==", "open").where("closesAt", "<=", Timestamp.fromDate(now)).limit(50).get();
      return snap.docs.map(d => d.id);
    },

    async awaitingNotification() {
      const snap = await polls().where("status", "==", "closed").where("notified", "==", false).limit(50).get();
      return snap.docs.map(d => d.id);
    },

    async notifyList(pollId) {
      const snap = await polls().doc(pollId).collection("ballots").where("notify", "==", true).get();
      return snap.docs.flatMap(d => typeof d.get("notifyEmail") === "string" ? [{ ballotId: d.id, email: d.get("notifyEmail") as string }] : []);
    },

    async markNotified(pollId) {
      const ref = polls().doc(pollId);
      const snap = await ref.collection("ballots").where("notify", "==", true).get();
      const writer = firestore().bulkWriter();
      for (const d of snap.docs) writer.update(d.ref, { notify: false, notifyEmail: FieldValue.delete() });
      writer.update(ref, { notified: true });
      await writer.close();
    },

    async remove(id) { await firestore().recursiveDelete(polls().doc(id)); },

    async hit(key, limit, windowMs) {
      const window = Math.floor(Date.now() / windowMs);
      const ref = firestore().collection("ratelimits").doc(`${key}:${window}`);
      return firestore().runTransaction(async tx => {
        const count = (await tx.get(ref)).data()?.count ?? 0;
        if (count >= limit) return false;
        tx.set(ref, { count: count + 1, expireAt: later((window + 1) * windowMs, 0) });
        return true;
      });
    },
  };
}
