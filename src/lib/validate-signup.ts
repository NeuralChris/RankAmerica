import { asStateCode, type StateCode } from "./states";
export type Signup = {
  name: string;
  email: string;
  state: StateCode;
  address: string;
  phone: string;
  consent: true;
};
export type SignupField = "name" | "email" | "state" | "phone" | "address" | "consent";
export type SignupErrors = Partial<Record<SignupField, string>>;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Per-field messages shown to visitors. Shared by the form (client) and /api/subscribe (server). */
export function signupErrors(obj: Record<string, unknown>): SignupErrors {
  const errors: SignupErrors = {};
  const name = text(obj.name), email = text(obj.email);
  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > 100 || /[\r\n]/.test(name)) errors.name = "Please keep your name under 100 characters.";
  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "That email address doesn’t look quite right.";
  if (!asStateCode(obj.state)) errors.state = "Please choose your state.";
  if (text(obj.phone).length > 40) errors.phone = "Please keep the phone number under 40 characters.";
  if (text(obj.address).length > 300) errors.address = "Please keep the address under 300 characters.";
  if (obj.consent !== true) errors.consent = "Please check this box so we can send you updates.";
  return errors;
}

export function validateSignup(value: unknown): Signup | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (Object.keys(signupErrors(obj)).length) return null;
  return { name: text(obj.name), email: text(obj.email).toLowerCase(), state: asStateCode(obj.state)!, address: text(obj.address), phone: text(obj.phone), consent: true };
}
