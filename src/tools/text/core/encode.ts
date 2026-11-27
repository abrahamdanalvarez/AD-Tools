// Encoding and decoding helpers. Pure, so they're unit-tested in Node.

/** A problem the user can fix. Its message is shown as is (see the file shell's messageFor). */
export class InputError extends Error {
  name = "InputError";
}

// ── Base64 (UTF-8 text) ──────────────────────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

export function base64ToBytes(text: string): Uint8Array {
  const body = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body) || body.length % 4 === 1) throw new InputError("This isn't valid Base64. Check for missing or extra characters.");
  const bin = atob(body.padEnd(Math.ceil(body.length / 4) * 4, "="));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const encodeBase64 = (text: string, urlSafe: boolean) => bytesToBase64(new TextEncoder().encode(text), urlSafe);

export function decodeBase64(text: string): string {
  const bytes = base64ToBytes(text);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InputError("This Base64 decodes to binary data, not text. Use Base64 to Image for pictures.");
  }
}

// ── URL ──────────────────────────────────────────────────────────────────────

export function encodeUrl(text: string, mode: "component" | "uri"): string {
  return mode === "component" ? encodeURIComponent(text) : encodeURI(text);
}

export function decodeUrl(text: string, plusAsSpace: boolean): string {
  try {
    return decodeURIComponent(plusAsSpace ? text.replace(/\+/g, " ") : text);
  } catch {
    throw new InputError("This contains a broken percent-encoding (a % not followed by two hex digits, or invalid UTF-8).");
  }
}

// ── HTML entities ────────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", euro: "€", pound: "£", yen: "¥", cent: "¢",
  sect: "§", para: "¶", middot: "·", bull: "•", deg: "°", plusmn: "±", times: "×", divide: "÷", frac12: "½", frac14: "¼",
  frac34: "¾", laquo: "«", raquo: "»", iexcl: "¡", iquest: "¿", micro: "µ", larr: "←", rarr: "→", uarr: "↑", darr: "↓",
};

export function encodeEntities(text: string, all: boolean): string {
  return text.replace(all ? /[^\x20-\x7E\n\r\t]|[&<>"']/gu : /[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    if (c === "'") return "&#39;";
    return `&#${c.codePointAt(0)};`;
  });
}

/** Decodes named (common set), decimal and hex entities. Never parses HTML. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
    }
    return NAMED[e.toLowerCase()] ?? NAMED[e] ?? m;
  });
}

// ── JWT ──────────────────────────────────────────────────────────────────────

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: unknown;
  signature: string;
  /** Registered time claims, as dates. */
  times: { claim: "exp" | "nbf" | "iat"; date: Date }[];
}

/** Decodes a JWT's header and payload. Does NOT verify the signature. */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".");
  if (parts.length !== 3) throw new InputError(parts.length === 5 ? "This is an encrypted token (JWE). Its contents can't be read without the key." : "A JWT has three parts separated by dots.");
  const part = (s: string, name: string) => {
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(s)));
    } catch {
      throw new InputError(`The ${name} isn't valid Base64URL-encoded JSON.`);
    }
  };
  const header = part(parts[0], "header");
  if (typeof header !== "object" || header === null || Array.isArray(header)) throw new InputError("The header isn't a JSON object.");
  const payload = part(parts[1], "payload");
  const times: DecodedJwt["times"] = [];
  if (payload && typeof payload === "object")
    for (const claim of ["iat", "nbf", "exp"] as const) {
      const v = (payload as Record<string, unknown>)[claim];
      if (typeof v === "number" && Number.isFinite(v)) times.push({ claim, date: new Date(v * 1000) });
    }
  return { header, payload, signature: parts[2], times };
}
