/** US state directory, shared by hero discovery and email list routing. */
export const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
} as const;
export type StateCode = keyof typeof STATES;
export const STATE_CODES = Object.keys(STATES) as StateCode[];

export function asStateCode(value: unknown): StateCode | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/^US-/, "");
  return Object.prototype.hasOwnProperty.call(STATES, code) ? code as StateCode : null;
}

/** Add each approved/generated asset here as it becomes available. */
const AVAILABLE_HERO_ASSETS = new Set<StateCode>(["CO"]);
export const HERO_FALLBACK = "/images/hero-default.webp";
export function getHero(state: StateCode | null) {
  if (state && AVAILABLE_HERO_ASSETS.has(state)) {
    return { src: `/images/states/${state}.webp`, alt: `State-specific artwork for ${STATES[state]}`, state };
  }
  return { src: HERO_FALLBACK, alt: "Illustrated mountain landscape with a sunset sky", state: null };
}
