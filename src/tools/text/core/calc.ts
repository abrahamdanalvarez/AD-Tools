// Calculators for the productivity tools. Pure, unit-tested. Each tool page
// states the assumptions made here.
import { InputError } from "./encode";

export function toNumber(s: string, name: string, opts: { min?: number; max?: number; allowZero?: boolean } = {}): number {
  const t = s.trim().replace(/,/g, "");
  if (!t) throw new InputError(`Enter ${name}.`);
  const n = Number(t);
  if (!Number.isFinite(n)) throw new InputError(`${name[0].toUpperCase()}${name.slice(1)} must be a number.`);
  if (opts.min !== undefined && n < opts.min) throw new InputError(`${name[0].toUpperCase()}${name.slice(1)} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw new InputError(`${name[0].toUpperCase()}${name.slice(1)} must be at most ${opts.max}.`);
  if (opts.allowZero === false && n === 0) throw new InputError(`${name[0].toUpperCase()}${name.slice(1)} can't be zero.`);
  return n;
}

/** Up to `digits` significant decimals, without trailing zeros or exponent noise. */
export function fmt(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6)) return n.toExponential(digits - 1).replace(/\.?0+e/, "e");
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, useGrouping: true }).format(n);
}

export const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── Units ────────────────────────────────────────────────────────────────────

interface Unit {
  label: string;
  /** Multiply to get the base unit (linear units). */
  factor?: number;
  toBase?: (v: number) => number;
  fromBase?: (v: number) => number;
}

/** Exact international definitions (1 in = 2.54 cm, 1 lb = 0.45359237 kg, US gallons and fluid ounces). */
export const UNITS: Record<string, { label: string; units: Record<string, Unit> }> = {
  length: {
    label: "Length",
    units: {
      mm: { label: "Millimetres (mm)", factor: 0.001 },
      cm: { label: "Centimetres (cm)", factor: 0.01 },
      m: { label: "Metres (m)", factor: 1 },
      km: { label: "Kilometres (km)", factor: 1000 },
      in: { label: "Inches (in)", factor: 0.0254 },
      ft: { label: "Feet (ft)", factor: 0.3048 },
      yd: { label: "Yards (yd)", factor: 0.9144 },
      mi: { label: "Miles (mi)", factor: 1609.344 },
      nmi: { label: "Nautical miles", factor: 1852 },
    },
  },
  mass: {
    label: "Weight",
    units: {
      mg: { label: "Milligrams (mg)", factor: 1e-6 },
      g: { label: "Grams (g)", factor: 0.001 },
      kg: { label: "Kilograms (kg)", factor: 1 },
      t: { label: "Tonnes (t)", factor: 1000 },
      oz: { label: "Ounces (oz)", factor: 0.028349523125 },
      lb: { label: "Pounds (lb)", factor: 0.45359237 },
      st: { label: "Stones (st)", factor: 6.35029318 },
    },
  },
  temperature: {
    label: "Temperature",
    units: {
      c: { label: "Celsius (°C)", toBase: (v) => v, fromBase: (v) => v },
      f: { label: "Fahrenheit (°F)", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      k: { label: "Kelvin (K)", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    },
  },
  volume: {
    label: "Volume",
    units: {
      ml: { label: "Millilitres (ml)", factor: 0.001 },
      l: { label: "Litres (l)", factor: 1 },
      m3: { label: "Cubic metres (m³)", factor: 1000 },
      tsp: { label: "US teaspoons", factor: 0.00492892159375 },
      tbsp: { label: "US tablespoons", factor: 0.01478676478125 },
      floz: { label: "US fluid ounces", factor: 0.0295735295625 },
      cup: { label: "US cups", factor: 0.2365882365 },
      gal: { label: "US gallons", factor: 3.785411784 },
      ukgal: { label: "UK gallons", factor: 4.54609 },
    },
  },
  area: {
    label: "Area",
    units: {
      cm2: { label: "Square centimetres", factor: 1e-4 },
      m2: { label: "Square metres", factor: 1 },
      ha: { label: "Hectares", factor: 1e4 },
      km2: { label: "Square kilometres", factor: 1e6 },
      ft2: { label: "Square feet", factor: 0.09290304 },
      ac: { label: "Acres", factor: 4046.8564224 },
      mi2: { label: "Square miles", factor: 2589988.110336 },
    },
  },
  speed: {
    label: "Speed",
    units: {
      ms: { label: "Metres per second", factor: 1 },
      kmh: { label: "Kilometres per hour", factor: 1 / 3.6 },
      mph: { label: "Miles per hour", factor: 0.44704 },
      kn: { label: "Knots", factor: 1852 / 3600 },
    },
  },
  time: {
    label: "Time",
    units: {
      s: { label: "Seconds", factor: 1 },
      min: { label: "Minutes", factor: 60 },
      h: { label: "Hours", factor: 3600 },
      d: { label: "Days", factor: 86400 },
      wk: { label: "Weeks", factor: 604800 },
      yr: { label: "Years (365.25 days)", factor: 31557600 },
    },
  },
};

export function convertUnit(value: number, kind: string, from: string, to: string): number {
  const units = UNITS[kind]?.units;
  const f = units?.[from], t = units?.[to];
  if (!f || !t) throw new InputError("Choose two units.");
  const base = f.toBase ? f.toBase(value) : value * f.factor!;
  if (kind === "temperature" && base < -273.15 - 1e-9) throw new InputError("That's below absolute zero.");
  return t.fromBase ? t.fromBase(base) : base / t.factor!;
}

// ── File sizes ───────────────────────────────────────────────────────────────

export const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15,
  KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4, PiB: 1024 ** 5,
  bit: 1 / 8, kbit: 1e3 / 8, Mbit: 1e6 / 8, Gbit: 1e9 / 8,
};

// ── Percentages ──────────────────────────────────────────────────────────────

export type PercentMode = "of" | "is-what" | "change" | "increase" | "decrease";

export function percent(mode: PercentMode, a: number, b: number): { value: number; text: string } {
  switch (mode) {
    case "of":
      return { value: (a / 100) * b, text: `${fmt(a)}% of ${fmt(b)} = ${fmt((a / 100) * b)}` };
    case "is-what":
      if (b === 0) throw new InputError("The second number can't be zero.");
      return { value: (a / b) * 100, text: `${fmt(a)} is ${fmt((a / b) * 100)}% of ${fmt(b)}` };
    case "change": {
      if (a === 0) throw new InputError("The starting value can't be zero.");
      const v = ((b - a) / Math.abs(a)) * 100;
      return { value: v, text: `From ${fmt(a)} to ${fmt(b)} is a ${v >= 0 ? "rise" : "fall"} of ${fmt(Math.abs(v))}%` };
    }
    case "increase":
      return { value: a * (1 + b / 100), text: `${fmt(a)} + ${fmt(b)}% = ${fmt(a * (1 + b / 100))}` };
    case "decrease":
      return { value: a * (1 - b / 100), text: `${fmt(a)} − ${fmt(b)}% = ${fmt(a * (1 - b / 100))}` };
  }
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** A calendar date (no time, no time zone) from "YYYY-MM-DD". */
export function parseDay(s: string, name: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  if (!d || d.getUTCDate() !== Number(m![3])) throw new InputError(`Choose ${name}.`);
  return d;
}

export const dayString = (d: Date) => d.toISOString().slice(0, 10);

const DAY = 864e5;

/** Whole years, months and days from a to b (a ≤ b), counting like a calendar. */
export function ymd(a: Date, b: Date): { years: number; months: number; days: number } {
  // Whole months first (month ends clamp: 31 Jan + 1 month = 29 Feb), then the days left.
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  if (addToDate(a, months, "months") > b) months--;
  const days = daysBetween(addToDate(a, months, "months"), b);
  return { years: Math.floor(months / 12), months: months % 12, days };
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Monday–Friday days from a up to but not including b. */
export function weekdaysBetween(a: Date, b: Date): number {
  const [start, end] = a <= b ? [a, b] : [b, a];
  const total = daysBetween(start, end);
  let n = Math.floor(total / 7) * 5;
  for (let i = 0, d = start.getUTCDay(); i < total % 7; i++, d = (d + 1) % 7) if (d !== 0 && d !== 6) n++;
  return a <= b ? n : -n;
}

export function addToDate(d: Date, amount: number, unit: "days" | "weeks" | "months" | "years"): Date {
  const r = new Date(d);
  if (unit === "days") r.setUTCDate(r.getUTCDate() + amount);
  else if (unit === "weeks") r.setUTCDate(r.getUTCDate() + amount * 7);
  else {
    // Month ends are kept: 31 Jan + 1 month = 28 or 29 Feb, not 3 March.
    const months = unit === "months" ? amount : amount * 12;
    const day = r.getUTCDate();
    r.setUTCDate(1);
    r.setUTCMonth(r.getUTCMonth() + months);
    const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
    r.setUTCDate(Math.min(day, last));
  }
  return r;
}

export const weekday = (d: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(d);
export const longDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" }).format(d);

export function age(birth: Date, on: Date) {
  if (birth > on) throw new InputError("The birth date is after the date to calculate on.");
  const { years, months, days } = ymd(birth, on);
  // A 29 February birthday is celebrated on 28 February in common years.
  let next = addToDate(birth, years + 1, "years");
  if (next.getTime() <= on.getTime()) next = addToDate(birth, years + 2, "years");
  return { years, months, days, totalDays: daysBetween(birth, on), totalWeeks: Math.floor(daysBetween(birth, on) / 7), nextBirthday: next, daysToNext: daysBetween(on, next) };
}

// ── Durations ────────────────────────────────────────────────────────────────

/** "HH:MM" or "HH:MM:SS" → seconds after midnight. */
export function parseClock(s: string, name: string): number {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3] ?? 0) > 59) throw new InputError(`Enter ${name} as HH:MM.`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
}

export function hms(seconds: number): string {
  const s = Math.abs(Math.round(seconds));
  return `${seconds < 0 ? "-" : ""}${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** End before start means the period crosses midnight. */
export function clockDuration(start: number, end: number, breakMinutes: number): number {
  const d = (end - start + 86400) % 86400 - breakMinutes * 60;
  if (d < 0) throw new InputError("The break is longer than the time worked.");
  return d;
}

// ── Money ────────────────────────────────────────────────────────────────────

export interface Loan {
  payment: number;
  totalPaid: number;
  totalInterest: number;
  schedule: { period: number; payment: number; interest: number; principal: number; balance: number }[];
}

/** Fixed-rate amortising loan. Annual rate in %, compounded each payment period. */
export function loan(principal: number, annualRate: number, years: number, perYear: number): Loan {
  const n = Math.round(years * perYear);
  if (n < 1) throw new InputError("The term must be at least one payment.");
  if (n > 1200) throw new InputError("The term can be at most 1,200 payments.");
  const r = annualRate / 100 / perYear;
  const payment = r === 0 ? principal / n : (principal * r) / (1 - (1 + r) ** -n);
  const schedule: Loan["schedule"] = [];
  let balance = principal;
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const p = i === n ? balance : payment - interest;
    balance = Math.max(0, balance - p);
    schedule.push({ period: i, payment: p + interest, interest, principal: p, balance });
  }
  const totalPaid = schedule.reduce((s, x) => s + x.payment, 0);
  return { payment, totalPaid, totalInterest: totalPaid - principal, schedule };
}

export function bmi(weightKg: number, heightM: number): { bmi: number; category: string } {
  const v = weightKg / (heightM * heightM);
  const category = v < 18.5 ? "Underweight" : v < 25 ? "Healthy weight" : v < 30 ? "Overweight" : "Obesity";
  return { bmi: v, category };
}

export function tip(bill: number, tipPercent: number, people: number, roundUp: boolean) {
  const tipAmount = (bill * tipPercent) / 100;
  let perPerson = (bill + tipAmount) / people;
  if (roundUp) perPerson = Math.ceil(perPerson);
  return { tip: tipAmount, total: bill + tipAmount, perPerson, totalPaid: perPerson * people };
}

/** Discounts applied one after the other (a second 10% applies to the reduced price). */
export function discount(price: number, percents: number[], taxPercent: number) {
  const after = percents.reduce((p, d) => p * (1 - d / 100), price);
  const withTax = after * (1 + taxPercent / 100);
  return { final: after, saved: price - after, effective: price ? ((price - after) / price) * 100 : 0, withTax };
}
