// Timestamp and date-format conversion. Uses the browser's Date and Intl, so
// local time follows the device's time zone and daylight-saving rules.
import { InputError } from "./encode";

/** Dates JavaScript can represent: ±100,000,000 days from 1970. */
const MAX_MS = 8.64e15;

export type TimestampUnit = "auto" | "s" | "ms";

/** Seconds below 100 billion (until the year 5138); larger numbers are read as milliseconds. */
export function fromTimestamp(text: string, unit: TimestampUnit): { date: Date; unit: "s" | "ms" } {
  const t = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) throw new InputError("Enter a Unix timestamp: a whole number of seconds or milliseconds.");
  const n = Number(t);
  const u = unit === "auto" ? (Math.abs(n) >= 1e11 ? "ms" : "s") : unit;
  const ms = u === "s" ? n * 1000 : n;
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) throw new InputError("That timestamp is outside the range of dates a browser can show.");
  return { date: new Date(ms), unit: u };
}

/** Accepts ISO 8601, RFC 2822, Unix timestamps, and the forms browsers parse consistently. */
export function parseDate(text: string): Date {
  const t = text.trim();
  if (!t) throw new InputError("Enter a date.");
  if (t.toLowerCase() === "now") return new Date();
  if (/^-?\d+(\.\d+)?$/.test(t)) return fromTimestamp(t, "auto").date;
  // Date-only ISO strings are UTC in JavaScript; read them as local midnight like people expect.
  const dateOnly = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(t);
  if (Number.isNaN(d.getTime())) throw new InputError("This date wasn't recognised. Use a form like 2026-11-27 14:30, 2026-11-27T14:30:00Z or a Unix timestamp.");
  return d;
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, "0");

/** ISO 8601 in local time with the UTC offset, for example 2026-11-27T14:30:00+08:00. */
export function isoLocal(d: Date): string {
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${off >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

/** ISO 8601 week number and week-year. */
export function isoWeek(d: Date): { week: number; year: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return { week: Math.ceil(((t.getTime() - yearStart) / 864e5 + 1) / 7), year: t.getUTCFullYear() };
}

export function dayOfYear(d: Date): number {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 864e5) + 1;
}

export function relative(d: Date, now = new Date()): string {
  const diff = (d.getTime() - now.getTime()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  const [unit, size] = units.find(([, s]) => Math.abs(diff) >= s) ?? ["second", 1];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(diff / size), unit);
}

export function inZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "full", timeStyle: "long" }).format(d);
}

export function dateFormats(d: Date, timeZone: string): [string, string][] {
  const { week, year } = isoWeek(d);
  return [
    ["ISO 8601 (UTC)", d.toISOString()],
    ["ISO 8601 (local)", isoLocal(d)],
    ["RFC 2822 / HTTP", d.toUTCString().replace("GMT", "+0000")],
    ["Unix seconds", String(Math.floor(d.getTime() / 1000))],
    ["Unix milliseconds", String(d.getTime())],
    [`In ${timeZone}`, inZone(d, timeZone)],
    ["Date only", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`],
    ["US style", `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`],
    ["European style", `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`],
    ["ISO week", `${year}-W${pad(week)}`],
    ["Day of year", String(dayOfYear(d))],
    ["Relative", relative(d)],
  ];
}

/** Every IANA time zone the browser knows, or a short list on older browsers. */
export function timeZones(): string[] {
  const supported = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const list = supported ? supported("timeZone") : ["Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Manila", "Asia/Tokyo", "Australia/Sydney"];
  return ["UTC", ...list.filter((z) => z !== "UTC")];
}
