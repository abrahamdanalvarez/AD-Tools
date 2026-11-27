// Standard 5-field cron (minute hour day-of-month month day-of-week), as used
// by crontab and most schedulers. Pure, unit-tested.
import { InputError } from "./encode";

const FIELDS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
  { name: "day of week", min: 0, max: 7, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
] as const;

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export interface Cron {
  sets: Set<number>[];
  /** Day of month and day of week both restricted: either may match (crontab rule). */
  domStar: boolean;
  dowStar: boolean;
}

function parseField(text: string, i: number): Set<number> {
  const f = FIELDS[i];
  const names = "names" in f ? (f.names as readonly string[]) : null;
  const value = (s: string) => {
    const n = names?.indexOf(s.toUpperCase()) ?? -1;
    const v = n >= 0 ? n + (f.min === 1 ? 1 : 0) : /^\d+$/.test(s) ? Number(s) : NaN;
    if (!Number.isInteger(v) || v < f.min || v > f.max) throw new InputError(`"${s}" isn't a valid ${f.name} (${f.min}–${f.max}).`);
    return v;
  };
  const out = new Set<number>();
  for (const part of text.split(",")) {
    const m = part.match(/^(\*|[^-/]+)(?:-([^/]+))?(?:\/(\d+))?$/);
    if (!m) throw new InputError(`"${part}" isn't a valid ${f.name}.`);
    const step = m[3] ? Number(m[3]) : 1;
    if (step < 1) throw new InputError(`The step in "${part}" must be 1 or more.`);
    const start = m[1] === "*" ? f.min : value(m[1]);
    const end = m[1] === "*" ? f.max : m[2] ? value(m[2]) : m[3] ? f.max : start;
    if (end < start) throw new InputError(`The range "${part}" goes backwards.`);
    for (let v = start; v <= end; v += step) out.add(i === 4 && v === 7 ? 0 : v);
  }
  return out;
}

export function parseCron(expr: string): Cron {
  const text = MACROS[expr.trim().toLowerCase()] ?? expr.trim();
  const parts = text.split(/\s+/);
  if (parts.length !== 5) throw new InputError(`A cron expression has 5 fields (minute hour day month weekday); this has ${parts.length}.`);
  return { sets: parts.map(parseField), domStar: parts[2] === "*", dowStar: parts[4] === "*" };
}

export function matches(c: Cron, d: Date): boolean {
  const [min, hour, dom, mon, dow] = c.sets;
  if (!min.has(d.getMinutes()) || !hour.has(d.getHours()) || !mon.has(d.getMonth() + 1)) return false;
  const domOk = dom.has(d.getDate()), dowOk = dow.has(d.getDay());
  if (c.domStar || c.dowStar) return domOk && dowOk;
  return domOk || dowOk;
}

/** The next `count` run times after `from`, in local time. Searches up to 5 years ahead. */
export function nextRuns(c: Cron, from: Date, count: number): Date[] {
  const out: Date[] = [];
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const limit = from.getTime() + 5 * 366 * 864e5;
  while (out.length < count && d.getTime() < limit) {
    if (!c.sets[3].has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0);
    } else if (!(c.domStar || c.dowStar ? c.sets[2].has(d.getDate()) && c.sets[4].has(d.getDay()) : c.sets[2].has(d.getDate()) || c.sets[4].has(d.getDay()))) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0);
    } else if (!c.sets[1].has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0);
    } else if (!c.sets[0].has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1);
    } else {
      out.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    }
  }
  return out;
}

export interface CronBuilder {
  minute: string;
  hour: string;
  dom: string;
  month: string;
  dow: string;
}

export const buildCron = (b: CronBuilder) => [b.minute, b.hour, b.dom, b.month, b.dow].map((x) => x.trim() || "*").join(" ");
