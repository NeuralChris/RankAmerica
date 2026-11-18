import { asStateCode, type StateCode } from "./states";
export type Signup = {
  name: string;
  email: string;
  state: StateCode;
  address: string;
  phone: string;
  consent: true;
};
export function validateSignup(value: unknown): Signup | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  const state = asStateCode(obj.state);
  const address = typeof obj.address === "string" ? obj.address.trim() : "";
  const phone = typeof obj.phone === "string" ? obj.phone.trim() : "";
  if (!state || name.length < 2 || name.length > 100 || /[\r\n]/.test(name) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || address.length > 300 || phone.length > 40 || obj.consent !== true) return null;
  return {name,email,state,address,phone,consent:true};
}
