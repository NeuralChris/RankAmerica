import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ ok: true, project: "rank-america" }); }
