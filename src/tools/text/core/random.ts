// Secure random values from Web Crypto (crypto.getRandomValues). Math.random is
// never used here: its output can be predicted.

/** A uniform integer in [0, max), without modulo bias (rejection sampling). */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError("max");
  const limit = 2 ** 32 - (2 ** 32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function randomString(length: number, alphabet: string): string {
  const chars = [...new Set(alphabet)];
  if (chars.length === 0) return "";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}

export const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>/?~",
  hex: "0123456789abcdef",
};
const AMBIGUOUS = /[Il1O0o]/g;

export interface PasswordOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
}

/** Includes at least one character from every chosen set, then shuffles securely. */
export function password(o: PasswordOptions): string {
  const sets = (["upper", "lower", "digits", "symbols"] as const)
    .filter((k) => o[k])
    .map((k) => (o.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]));
  if (sets.length === 0) throw new RangeError("Choose at least one character type.");
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < o.length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, o.length).join("");
}

/** Entropy in bits of a random choice of `length` characters from `poolSize`. */
export const entropyBits = (length: number, poolSize: number) => (poolSize > 1 ? length * Math.log2(poolSize) : 0);

export function passwordPool(o: PasswordOptions): number {
  return (["upper", "lower", "digits", "symbols"] as const)
    .filter((k) => o[k])
    .reduce((n, k) => n + (o.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k]).length, 0);
}

export function strengthLabel(bits: number): string {
  if (bits < 40) return "Weak";
  if (bits < 60) return "Fair";
  if (bits < 80) return "Strong";
  return "Very strong";
}

/** RFC 9562 version 4 (random) UUID. */
export function uuidV4(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** RFC 9562 version 7 UUID: a millisecond timestamp, then random bits. Sorts by creation time. */
export function uuidV7(now = Date.now()): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let t = now;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
