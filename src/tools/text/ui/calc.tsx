// Productivity calculators. Each one states its assumptions next to the result.
import * as c from "../core/calc";
import { InputError } from "../core/encode";
import { Check, NumberInput, Row, SelectField, TextInput } from "./fields";
import type { AnyFormTool, FormTool } from "./shell";

const tool = <S,>(x: FormTool<S>) => x;
const today = () => new Date().toISOString().slice(0, 10);
const plural = (v: number, one: string, many = `${one}s`) => `${c.fmt(v)} ${Math.abs(v) === 1 ? one : many}`;

// ── Units ────────────────────────────────────────────────────────────────────

const unitTool = tool<{ kind: string; value: string; from: string; to: string }>({
  initial: () => ({ kind: "length", value: "1", from: "m", to: "ft" }),
  Inputs: ({ s, set }) => {
    const units = Object.entries(c.UNITS[s.kind].units).map(([value, u]) => ({ value, label: u.label }));
    return (
      <>
        <SelectField
          label="Measure"
          value={s.kind}
          options={Object.entries(c.UNITS).map(([value, k]) => ({ value, label: k.label }))}
          onChange={(kind) => {
            const keys = Object.keys(c.UNITS[kind].units);
            set({ kind, from: keys[0], to: keys[1] });
          }}
        />
        <Row>
          <NumberInput label="Value" value={s.value} onChange={(value) => set({ value })} className="w-40" />
          <SelectField label="From" value={s.from} options={units} onChange={(from) => set({ from })} />
          <SelectField label="To" value={s.to} options={units} onChange={(to) => set({ to })} />
        </Row>
      </>
    );
  },
  compute: (s) => {
    const v = c.toNumber(s.value, "a value");
    const u = c.UNITS[s.kind].units;
    const result = c.convertUnit(v, s.kind, s.from, s.to);
    // "Metres (m)" → "m", so the sentence never reads "1 metres".
    const short = (k: string) => /\(([^)]+)\)$/.exec(u[k].label)?.[1] ?? u[k].label.toLowerCase();
    return {
      node: (
        <p className="text-2xl font-bold">
          {c.fmt(v)} {short(s.from)} = {c.fmt(result, 8)} {short(s.to)}
        </p>
      ),
      rows: Object.keys(u)
        .filter((k) => k !== s.from)
        .map((k): [string, string] => [u[k].label, c.fmt(c.convertUnit(v, s.kind, s.from, k), 8)]),
      note: "Exact international definitions (1 inch = 2.54 cm, 1 pound = 0.45359237 kg). Gallons, cups and fluid ounces are US measures unless marked UK. Results are rounded to 8 decimal places.",
    };
  },
});

const fileSizeTool = tool<{ value: string; unit: string }>({
  initial: () => ({ value: "1", unit: "GB" }),
  Inputs: ({ s, set }) => (
    <Row>
      <NumberInput label="Size" value={s.value} onChange={(value) => set({ value })} className="w-40" />
      <SelectField label="Unit" value={s.unit} options={Object.keys(c.SIZE_UNITS).map((u) => ({ value: u, label: u }))} onChange={(unit) => set({ unit })} />
    </Row>
  ),
  compute: (s) => {
    const bytes = c.toNumber(s.value, "a size", { min: 0 }) * c.SIZE_UNITS[s.unit];
    return {
      rows: Object.entries(c.SIZE_UNITS)
        .filter(([u]) => u !== s.unit)
        .map(([u, f]): [string, string] => [u, c.fmt(bytes / f, 6)]),
      copyRows: true,
      note: "KB, MB, GB and TB are decimal (1 MB = 1,000,000 bytes), as used by drive makers and macOS. KiB, MiB, GiB and TiB are binary (1 MiB = 1,048,576 bytes), which Windows also labels “MB”. Bits are 1/8 of a byte.",
    };
  },
});

// ── Percentages ──────────────────────────────────────────────────────────────

const PERCENT_LABELS: Record<c.PercentMode, [string, string, string]> = {
  of: ["What is X% of Y?", "Percentage (X)", "Number (Y)"],
  "is-what": ["X is what percent of Y?", "Part (X)", "Whole (Y)"],
  change: ["Percentage change from X to Y", "From (X)", "To (Y)"],
  increase: ["Increase X by Y%", "Number (X)", "Percentage (Y)"],
  decrease: ["Decrease X by Y%", "Number (X)", "Percentage (Y)"],
};

const percentTool = tool<{ mode: c.PercentMode; a: string; b: string }>({
  initial: () => ({ mode: "of", a: "15", b: "200" }),
  Inputs: ({ s, set }) => (
    <>
      <SelectField
        label="Calculate"
        value={s.mode}
        options={(Object.keys(PERCENT_LABELS) as c.PercentMode[]).map((value) => ({ value, label: PERCENT_LABELS[value][0] }))}
        onChange={(mode) => set({ mode })}
      />
      <Row>
        <NumberInput label={PERCENT_LABELS[s.mode][1]} value={s.a} onChange={(a) => set({ a })} className="w-40" />
        <NumberInput label={PERCENT_LABELS[s.mode][2]} value={s.b} onChange={(b) => set({ b })} className="w-40" />
      </Row>
    </>
  ),
  compute: (s) => {
    const r = c.percent(s.mode, c.toNumber(s.a, "the first number"), c.toNumber(s.b, "the second number"));
    return { node: <p className="text-2xl font-bold">{r.text}</p>, rows: [["Result", c.fmt(r.value, 6)]], copyRows: true };
  },
});

// ── Dates ────────────────────────────────────────────────────────────────────

const dateTool = tool<{ mode: "between" | "add"; a: string; b: string; amount: string; unit: "days" | "weeks" | "months" | "years"; includeEnd: boolean }>({
  initial: () => ({ mode: "between", a: today(), b: `${new Date().getFullYear() + 1}-01-01`, amount: "30", unit: "days", includeEnd: false }),
  Inputs: ({ s, set }) => (
    <>
      <SelectField
        label="Calculate"
        value={s.mode}
        options={[
          { value: "between", label: "Time between two dates" },
          { value: "add", label: "Add to or subtract from a date" },
        ]}
        onChange={(mode) => set({ mode })}
      />
      <Row>
        <TextInput label={s.mode === "between" ? "Start date" : "Date"} type="date" value={s.a} onChange={(a) => set({ a })} />
        {s.mode === "between" ? (
          <TextInput label="End date" type="date" value={s.b} onChange={(b) => set({ b })} />
        ) : (
          <>
            <NumberInput label="Amount (negative to subtract)" value={s.amount} onChange={(amount) => set({ amount })} className="w-32" />
            <SelectField
              label="Unit"
              value={s.unit}
              options={(["days", "weeks", "months", "years"] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
              onChange={(unit) => set({ unit })}
            />
          </>
        )}
      </Row>
      {s.mode === "between" && <Check label="Include the end date (count both days)" checked={s.includeEnd} onChange={(includeEnd) => set({ includeEnd })} />}
    </>
  ),
  compute: (s) => {
    const a = c.parseDay(s.a, "a start date");
    if (s.mode === "add") {
      const amount = c.toNumber(s.amount, "an amount");
      if (!Number.isInteger(amount) || Math.abs(amount) > 100_000) throw new InputError("Enter a whole number up to 100,000.");
      const r = c.addToDate(a, amount, s.unit);
      return {
        node: <p className="text-2xl font-bold">{c.longDate(r)}</p>,
        rows: [["Date", c.dayString(r)]],
        copyRows: true,
        note: "Adding months or years keeps the day where it can: 31 January + 1 month is the last day of February.",
      };
    }
    const b = c.parseDay(s.b, "an end date");
    const [from, to] = a <= b ? [a, b] : [b, a];
    const extra = s.includeEnd ? 1 : 0;
    const days = c.daysBetween(from, to) + extra;
    const { years, months, days: d } = c.ymd(from, new Date(to.getTime() + extra * 864e5));
    return {
      node: <p className="text-2xl font-bold">{plural(days, "day")}</p>,
      rows: [
        ["Years, months, days", `${plural(years, "year")}, ${plural(months, "month")}, ${plural(d, "day")}`],
        ["Weeks", `${plural(Math.floor(days / 7), "week")} and ${plural(days % 7, "day")}`],
        ["Weekdays (Mon–Fri)", c.fmt(Math.abs(c.weekdaysBetween(from, new Date(to.getTime() + extra * 864e5))))],
        ["Hours", c.fmt(days * 24)],
      ],
      note: `${a > b ? "The dates were swapped so the earlier one comes first. " : ""}Calendar days, without time zones or daylight saving. Weekdays don't account for public holidays.`,
    };
  },
});

const ageTool = tool<{ birth: string; on: string }>({
  initial: () => ({ birth: "", on: today() }),
  Inputs: ({ s, set }) => (
    <Row>
      <TextInput label="Date of birth" type="date" value={s.birth} onChange={(birth) => set({ birth })} />
      <TextInput label="Age on" type="date" value={s.on} onChange={(on) => set({ on })} />
    </Row>
  ),
  compute: (s) => {
    if (!s.birth) return null;
    const a = c.age(c.parseDay(s.birth, "a date of birth"), c.parseDay(s.on, "a date"));
    return {
      node: <p className="text-2xl font-bold">{plural(a.years, "year")} old</p>,
      rows: [
        ["Exact age", `${plural(a.years, "year")}, ${plural(a.months, "month")}, ${plural(a.days, "day")}`],
        ["In weeks", c.fmt(a.totalWeeks)],
        ["In days", c.fmt(a.totalDays)],
        ["Next birthday", `${c.longDate(a.nextBirthday)} (in ${plural(a.daysToNext, "day")})`],
      ],
      note: "Counted in calendar months. People born on 29 February have their birthday on 28 February in other years.",
    };
  },
});

const durationTool = tool<{ start: string; end: string; breakMin: string }>({
  initial: () => ({ start: "09:00", end: "17:30", breakMin: "30" }),
  Inputs: ({ s, set }) => (
    <Row>
      <TextInput label="Start time" type="time" value={s.start} onChange={(start) => set({ start })} />
      <TextInput label="End time" type="time" value={s.end} onChange={(end) => set({ end })} />
      <NumberInput label="Break (minutes)" value={s.breakMin} onChange={(breakMin) => set({ breakMin })} className="w-28" />
    </Row>
  ),
  compute: (s) => {
    const secs = c.clockDuration(c.parseClock(s.start, "a start time"), c.parseClock(s.end, "an end time"), s.breakMin.trim() ? c.toNumber(s.breakMin, "the break", { min: 0, max: 1440 }) : 0);
    return {
      node: <p className="text-2xl font-bold">{c.hms(secs).replace(/:\d\d$/, "")} hours</p>,
      rows: [
        ["Hours and minutes", `${Math.floor(secs / 3600)} h ${Math.floor((secs % 3600) / 60)} min`],
        ["Decimal hours", c.fmt(secs / 3600, 2)],
        ["Minutes", c.fmt(secs / 60)],
      ],
      copyRows: true,
      note: "An end time before the start time is read as the next day (an overnight shift). Daylight-saving changes are not included.",
    };
  },
});

// ── Money and health ─────────────────────────────────────────────────────────

const loanTool = tool<{ amount: string; rate: string; years: string; perYear: string }>({
  initial: () => ({ amount: "200000", rate: "6", years: "30", perYear: "12" }),
  Inputs: ({ s, set }) => (
    <>
      <Row>
        <NumberInput label="Loan amount" value={s.amount} onChange={(amount) => set({ amount })} className="w-40" />
        <NumberInput label="Interest rate (% a year)" value={s.rate} onChange={(rate) => set({ rate })} className="w-32" />
        <NumberInput label="Term (years)" value={s.years} onChange={(years) => set({ years })} className="w-28" />
      </Row>
      <SelectField
        label="Payments"
        value={s.perYear}
        options={[
          { value: "12", label: "Monthly" },
          { value: "26", label: "Every two weeks" },
          { value: "52", label: "Weekly" },
          { value: "4", label: "Quarterly" },
          { value: "1", label: "Yearly" },
        ]}
        onChange={(perYear) => set({ perYear })}
      />
    </>
  ),
  compute: (s) => {
    const l = c.loan(c.toNumber(s.amount, "a loan amount", { min: 0, allowZero: false }), c.toNumber(s.rate, "an interest rate", { min: 0, max: 100 }), c.toNumber(s.years, "a term", { min: 0, allowZero: false }), Number(s.perYear));
    const yearRows = l.schedule.filter((x) => x.period % Number(s.perYear) === 0 || x.period === l.schedule.length);
    return {
      node: (
        <div className="grid gap-3">
          <p className="text-2xl font-bold">{c.money(l.payment)} per payment</p>
          <div tabIndex={0} role="region" aria-label="Yearly balance" className="max-h-80 overflow-auto">
            <table className="w-full text-right text-sm">
              <caption className="pb-2 text-left text-sm font-medium">Balance at the end of each year</caption>
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left font-medium">Year</th>
                  <th className="p-2 font-medium">Interest paid</th>
                  <th className="p-2 font-medium">Principal paid</th>
                  <th className="p-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((x, i) => {
                  const prev = i === 0 ? 0 : yearRows[i - 1].period;
                  const slice = l.schedule.slice(prev, x.period);
                  return (
                    <tr key={x.period} className="border-b border-border">
                      <td className="p-2 text-left">{Math.ceil(x.period / Number(s.perYear))}</td>
                      <td className="p-2">{c.money(slice.reduce((a, y) => a + y.interest, 0))}</td>
                      <td className="p-2">{c.money(slice.reduce((a, y) => a + y.principal, 0))}</td>
                      <td className="p-2">{c.money(x.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ),
      rows: [
        ["Number of payments", c.fmt(l.schedule.length)],
        ["Total paid", c.money(l.totalPaid)],
        ["Total interest", c.money(l.totalInterest)],
      ],
      note: "Assumes a fixed rate, compounded once per payment, with equal payments and no fees, insurance or taxes. Lenders may calculate differently (daily interest, APR with fees), so check their figures.",
    };
  },
});

const bmiTool = tool<{ system: "metric" | "imperial"; kg: string; cm: string; lb: string; ft: string; inch: string }>({
  initial: () => ({ system: "metric", kg: "", cm: "", lb: "", ft: "", inch: "" }),
  Inputs: ({ s, set }) => (
    <>
      <SelectField
        label="Units"
        value={s.system}
        options={[
          { value: "metric", label: "Kilograms and centimetres" },
          { value: "imperial", label: "Pounds, feet and inches" },
        ]}
        onChange={(system) => set({ system })}
      />
      {s.system === "metric" ? (
        <Row>
          <NumberInput label="Weight" suffix="kg" value={s.kg} onChange={(kg) => set({ kg })} className="w-28" />
          <NumberInput label="Height" suffix="cm" value={s.cm} onChange={(cm) => set({ cm })} className="w-28" />
        </Row>
      ) : (
        <Row>
          <NumberInput label="Weight" suffix="lb" value={s.lb} onChange={(lb) => set({ lb })} className="w-28" />
          <NumberInput label="Height" suffix="ft" value={s.ft} onChange={(ft) => set({ ft })} className="w-20" />
          <NumberInput label="and" suffix="in" value={s.inch} onChange={(inch) => set({ inch })} className="w-20" />
        </Row>
      )}
    </>
  ),
  compute: (s) => {
    if (s.system === "metric" ? !s.kg || !s.cm : !s.lb || !s.ft) return null;
    const kg = s.system === "metric" ? c.toNumber(s.kg, "a weight", { min: 1, max: 700 }) : c.toNumber(s.lb, "a weight", { min: 2, max: 1500 }) * 0.45359237;
    const m =
      s.system === "metric"
        ? c.toNumber(s.cm, "a height", { min: 30, max: 300 }) / 100
        : (c.toNumber(s.ft, "feet", { min: 1, max: 9 }) * 12 + (s.inch.trim() ? c.toNumber(s.inch, "inches", { min: 0, max: 11.99 }) : 0)) * 0.0254;
    const r = c.bmi(kg, m);
    return {
      node: (
        <p className="text-2xl font-bold">
          BMI {r.bmi.toFixed(1)} · {r.category}
        </p>
      ),
      rows: [["Healthy weight for your height (BMI 18.5–24.9)", `${(18.5 * m * m).toFixed(1)}–${(24.9 * m * m).toFixed(1)} kg`]],
      note: "Uses the WHO adult categories (under 18.5, 18.5–24.9, 25–29.9, 30 and over). BMI doesn't measure body fat and doesn't suit children, pregnancy, athletes or older adults well. It isn't medical advice: talk to a health professional.",
    };
  },
});

const tipTool = tool<{ bill: string; percent: string; people: string; roundUp: boolean }>({
  initial: () => ({ bill: "", percent: "15", people: "1", roundUp: false }),
  Inputs: ({ s, set }) => (
    <>
      <Row>
        <NumberInput label="Bill" value={s.bill} onChange={(bill) => set({ bill })} className="w-36" />
        <NumberInput label="Tip (%)" value={s.percent} onChange={(percent) => set({ percent })} className="w-24" />
        <NumberInput label="People" value={s.people} onChange={(people) => set({ people })} className="w-24" />
      </Row>
      <Check label="Round each share up to a whole amount" checked={s.roundUp} onChange={(roundUp) => set({ roundUp })} />
    </>
  ),
  compute: (s) => {
    if (!s.bill) return null;
    const people = c.toNumber(s.people, "the number of people", { min: 1, max: 1000 });
    if (!Number.isInteger(people)) throw new InputError("The number of people must be a whole number.");
    const r = c.tip(c.toNumber(s.bill, "a bill", { min: 0 }), c.toNumber(s.percent, "a tip", { min: 0, max: 100 }), people, s.roundUp);
    return {
      node: <p className="text-2xl font-bold">{c.money(r.perPerson)} {people > 1 ? "each" : "in total"}</p>,
      rows: [
        ["Tip", c.money(r.tip)],
        ["Total with tip", c.money(r.total)],
        ...(s.roundUp ? [["Total paid after rounding", c.money(r.totalPaid)] as [string, string]] : []),
      ],
      note: "The tip is worked out on the amount you enter. If tax is included in the bill, the tip includes it too.",
    };
  },
});

const discountTool = tool<{ price: string; d1: string; d2: string; tax: string }>({
  initial: () => ({ price: "", d1: "20", d2: "", tax: "" }),
  Inputs: ({ s, set }) => (
    <Row>
      <NumberInput label="Original price" value={s.price} onChange={(price) => set({ price })} className="w-36" />
      <NumberInput label="Discount (%)" value={s.d1} onChange={(d1) => set({ d1 })} className="w-24" />
      <NumberInput label="Extra discount (%)" value={s.d2} onChange={(d2) => set({ d2 })} className="w-24" />
      <NumberInput label="Sales tax (%)" value={s.tax} onChange={(tax) => set({ tax })} className="w-24" />
    </Row>
  ),
  compute: (s) => {
    if (!s.price) return null;
    const ds = [s.d1, s.d2].filter((x) => x.trim()).map((x) => c.toNumber(x, "a discount", { min: 0, max: 100 }));
    const r = c.discount(c.toNumber(s.price, "a price", { min: 0 }), ds, s.tax.trim() ? c.toNumber(s.tax, "a tax rate", { min: 0, max: 100 }) : 0);
    return {
      node: <p className="text-2xl font-bold">{c.money(r.final)}</p>,
      rows: [
        ["You save", `${c.money(r.saved)} (${c.fmt(r.effective, 2)}%)`],
        ...(s.tax.trim() ? [["Price with tax", c.money(r.withTax)] as [string, string]] : []),
      ],
      note: "A second discount applies to the already reduced price, so 20% then 10% is 28% off, not 30%. Tax is added after the discounts.",
    };
  },
});

export const calcConfigs: Record<string, AnyFormTool> = {
  "unit-converter": unitTool,
  "percentage-calculator": percentTool,
  "date-calculator": dateTool,
  "age-calculator": ageTool,
  "time-duration-calculator": durationTool,
  "loan-calculator": loanTool,
  "bmi-calculator": bmiTool,
  "tip-calculator": tipTool,
  "discount-calculator": discountTool,
  "file-size-converter": fileSizeTool,
};
