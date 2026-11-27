// Developer tools: formatters, converters, encoders, generators.
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { downloadBlob, formatBytes } from "@/lib/files";
import { InputError, decodeBase64, decodeEntities, decodeJwt, decodeUrl, encodeBase64, encodeEntities, encodeUrl } from "../core/encode";
import { contrast, parseColour, toCmyk, toHex, toHsl, toHsv, toRgb, type Rgba } from "../core/colour";
import { buildCron, nextRuns, parseCron, type CronBuilder } from "../core/cron";
import * as data from "../core/data";
import { formatCode, formatSql, type CodeLanguage, type SqlDialect } from "../core/format";
import { HASH_LABELS, WEAK, hashText, type HashAlgorithm } from "../core/hash";
import { entropyBits, password, passwordPool, randomString, SETS, strengthLabel, uuidV4, uuidV7 } from "../core/random";
import { MAX_MATCHES, type RegexMatch } from "../core/regex";
import { slugify } from "../core/text";
import { dateFormats, fromTimestamp, parseDate, timeZones, type TimestampUnit } from "../core/time";
import { renderMarkdown } from "../markdown";
import { runRegex } from "../regex";
import { MarkdownPreview } from "./markdown-preview";
import { Check, ColourInput, NumberInput, RangeField, Row, SelectField, TextArea, TextInput } from "./fields";
import type { AnyFormTool, FormTool, Output } from "./shell";

const tool = <S,>(c: FormTool<S>) => c;
const bytes = (s: string) => new TextEncoder().encode(s).length;
const TXT = "text/plain";

type IndentS = data.Indent;
const indentOptions = [
  { value: "2" as const, label: "2 spaces" },
  { value: "4" as const, label: "4 spaces" },
  { value: "tab" as const, label: "Tabs" },
];
/** YAML can't be indented with tabs. */
const spaceIndents = [
  { value: "2" as const, label: "2 spaces" },
  { value: "4" as const, label: "4 spaces" },
];

// ── JSON ─────────────────────────────────────────────────────────────────────

interface JsonS {
  input: string;
  indent: IndentS;
  sort: boolean;
}

const jsonInputs = ({ s, set, formatting }: { s: JsonS; set: (p: Partial<JsonS>) => void; formatting: boolean }) => (
  <>
    <TextArea label="JSON" value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder='{"name": "Privora", "tools": 100}' />
    {formatting && (
      <Row>
        <SelectField label="Indent" value={s.indent} options={indentOptions} onChange={(indent) => set({ indent })} />
        <Check label="Sort keys A–Z" checked={s.sort} onChange={(sort) => set({ sort })} />
      </Row>
    )}
  </>
);

const jsonInitial = (): JsonS => ({ input: "", indent: "2", sort: false });

const jsonFormatter = tool<JsonS>({
  initial: jsonInitial,
  textKeys: ["input"],
  Inputs: (p) => jsonInputs({ ...p, formatting: true }),
  compute: (s) => {
    if (!s.input.trim()) return null;
    const text = data.formatJson(s.input, s.indent, s.sort);
    return { note: `Valid JSON: ${data.describeJson(JSON.parse(text))}.`, text, textLabel: "Formatted JSON", download: { name: "formatted.json", type: "application/json" } };
  },
});

const jsonValidator = tool<JsonS>({
  initial: jsonInitial,
  textKeys: ["input"],
  Inputs: (p) => jsonInputs({ ...p, formatting: false }),
  compute: (s) => {
    if (!s.input.trim()) return null;
    const v = data.parseJson(s.input);
    const depth = (x: unknown): number => (x && typeof x === "object" ? 1 + Math.max(0, ...Object.values(x).map(depth)) : 0);
    return {
      note: <span className="font-semibold text-success-text">Valid JSON.</span>,
      rows: [
        ["Contains", data.describeJson(v)],
        ["Nesting depth", String(depth(v))],
        ["Size", formatBytes(bytes(s.input))],
      ],
    };
  },
});

const jsonMinifier = tool<JsonS>({
  initial: jsonInitial,
  textKeys: ["input"],
  Inputs: (p) => jsonInputs({ ...p, formatting: false }),
  compute: (s) => {
    if (!s.input.trim()) return null;
    const text = data.minifyJson(s.input);
    const [a, b] = [bytes(s.input), bytes(text)];
    return { note: `${formatBytes(a)} → ${formatBytes(b)}${a > b ? ` (${Math.round((1 - b / a) * 100)}% smaller)` : ""}`, text, textLabel: "Minified JSON", download: { name: "minified.json", type: "application/json" } };
  },
});

// ── Code formatters ──────────────────────────────────────────────────────────

interface CodeS {
  input: string;
  language: CodeLanguage;
  indent: "2" | "4" | "tab";
  width: string;
  semi: boolean;
  singleQuote: boolean;
}

const EXT: Record<CodeLanguage, [string, string]> = {
  javascript: ["js", "text/javascript"],
  typescript: ["ts", TXT],
  css: ["css", "text/css"],
  scss: ["scss", TXT],
  less: ["less", TXT],
  html: ["html", "text/html"],
};

const codeTool = (label: string, languages: { value: CodeLanguage; label: string }[], placeholder: string, jsOptions = false) =>
  tool<CodeS>({
    initial: () => ({ input: "", language: languages[0].value, indent: "2", width: "80", semi: true, singleQuote: false }),
    textKeys: ["input"],
    Inputs: ({ s, set }) => (
      <>
        <TextArea label={label} value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder={placeholder} />
        <Row>
          {languages.length > 1 && <SelectField label="Language" value={s.language} options={languages} onChange={(language) => set({ language })} />}
          <SelectField label="Indent" value={s.indent} options={indentOptions} onChange={(indent) => set({ indent })} />
          <SelectField
            label="Line width"
            value={s.width}
            options={["60", "80", "100", "120"].map((v) => ({ value: v, label: `${v} characters` }))}
            onChange={(width) => set({ width })}
          />
        </Row>
        {jsOptions && (
          <Row>
            <Check label="Semicolons" checked={s.semi} onChange={(semi) => set({ semi })} />
            <Check label="Single quotes" checked={s.singleQuote} onChange={(singleQuote) => set({ singleQuote })} />
          </Row>
        )}
      </>
    ),
    compute: async (s) => {
      if (!s.input.trim()) return null;
      const text = await formatCode(s.input, s.language, {
        indent: s.indent === "tab" ? "tab" : (Number(s.indent) as 2 | 4),
        printWidth: Number(s.width),
        semi: s.semi,
        singleQuote: s.singleQuote,
      });
      const [ext, type] = EXT[s.language];
      return { text, textLabel: "Formatted code", download: { name: `formatted.${ext}`, type } };
    },
  });

interface SqlS {
  input: string;
  dialect: SqlDialect;
  indent: "2" | "4" | "tab";
  keywordCase: "upper" | "lower" | "preserve";
}

const sqlFormatter = tool<SqlS>({
  initial: () => ({ input: "", dialect: "sql", indent: "2", keywordCase: "upper" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="SQL" value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder="select id, name from users where active = 1 order by name" />
      <Row>
        <SelectField
          label="Dialect"
          value={s.dialect}
          options={[
            { value: "sql", label: "Standard SQL" },
            { value: "mysql", label: "MySQL" },
            { value: "mariadb", label: "MariaDB" },
            { value: "postgresql", label: "PostgreSQL" },
            { value: "sqlite", label: "SQLite" },
            { value: "transactsql", label: "SQL Server (T-SQL)" },
            { value: "plsql", label: "Oracle PL/SQL" },
            { value: "bigquery", label: "BigQuery" },
          ]}
          onChange={(dialect) => set({ dialect })}
        />
        <SelectField label="Indent" value={s.indent} options={indentOptions} onChange={(indent) => set({ indent })} />
        <SelectField
          label="Keywords"
          value={s.keywordCase}
          options={[
            { value: "upper", label: "UPPERCASE" },
            { value: "lower", label: "lowercase" },
            { value: "preserve", label: "As written" },
          ]}
          onChange={(keywordCase) => set({ keywordCase })}
        />
      </Row>
    </>
  ),
  compute: async (s) => {
    if (!s.input.trim()) return null;
    const text = await formatSql(s.input, { dialect: s.dialect, indent: s.indent === "tab" ? "tab" : (Number(s.indent) as 2 | 4), keywordCase: s.keywordCase });
    return { text, textLabel: "Formatted SQL", download: { name: "formatted.sql", type: TXT } };
  },
});

interface XmlS {
  input: string;
  indent: IndentS | "minify";
}

const xmlFormatter = tool<XmlS>({
  initial: () => ({ input: "", indent: "2" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="XML" value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder='<note><to>Ann</to><body>Hi</body></note>' />
      <SelectField label="Indent" value={s.indent} options={[...indentOptions, { value: "minify" as const, label: "Minify (one line)" }]} onChange={(indent) => set({ indent })} />
    </>
  ),
  compute: (s) => (s.input.trim() ? { text: data.formatXml(s.input, s.indent), textLabel: "Formatted XML", download: { name: "formatted.xml", type: "application/xml" } } : null),
});

interface YamlS {
  input: string;
  indent: "2" | "4";
}

const yamlFormatter = tool<YamlS>({
  initial: () => ({ input: "", indent: "2" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="YAML" value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder={"name: Privora\ntools:   [pdf, image]"} />
      <SelectField label="Indent" value={s.indent} options={spaceIndents} onChange={(indent) => set({ indent })} />
    </>
  ),
  compute: async (s) =>
    s.input.trim() ? { text: await data.formatYaml(s.input, Number(s.indent) as 2 | 4), textLabel: "Formatted YAML", download: { name: "formatted.yaml", type: TXT } } : null,
});

// ── Conversions ──────────────────────────────────────────────────────────────

interface ConvS {
  input: string;
  indent: IndentS;
  delimiter: string;
  header: boolean;
  types: boolean;
  root: string;
}

const convInitial = (): ConvS => ({ input: "", indent: "2", delimiter: ",", header: true, types: true, root: "root" });
const delimiters = [
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe" },
];

const convert = (
  from: string,
  placeholder: string,
  run: (s: ConvS) => Promise<Output> | Output,
  options?: (s: ConvS, set: (p: Partial<ConvS>) => void) => ReactNode,
) =>
  tool<ConvS>({
    initial: convInitial,
    textKeys: ["input"],
    Inputs: ({ s, set }) => (
      <>
        <TextArea label={from} value={s.input} onChange={(input) => set({ input })} mono rows={12} placeholder={placeholder} />
        {options?.(s, set)}
      </>
    ),
    compute: (s) => (s.input.trim() ? run(s) : null),
  });

const indentSelect = (s: ConvS, set: (p: Partial<ConvS>) => void) => <SelectField label="Indent" value={s.indent} options={indentOptions} onChange={(indent) => set({ indent })} />;

const jsonToCsv = convert(
  "JSON (an array of objects)",
  '[{"name": "Ann", "age": 31}, {"name": "Ben", "age": 28}]',
  async (s) => {
    const { csv, rows, columns } = await data.jsonToCsv(s.input, s.delimiter);
    return { note: `${rows} rows, ${columns} columns.`, text: csv, textLabel: "CSV", download: { name: "data.csv", type: "text/csv" } };
  },
  (s, set) => <SelectField label="Delimiter" value={s.delimiter} options={delimiters} onChange={(delimiter) => set({ delimiter })} />,
);

const csvToJson = convert(
  "CSV",
  "name,age\nAnn,31\nBen,28",
  async (s) => {
    const { json, rows } = await data.csvToJson(s.input, { header: s.header, types: s.types, delimiter: s.delimiter });
    const text = JSON.stringify(json, null, s.indent === "tab" ? "\t" : Number(s.indent));
    return { note: `${rows} rows.`, text, textLabel: "JSON", download: { name: "data.json", type: "application/json" } };
  },
  (s, set) => (
    <>
      <Row>
        <SelectField label="Delimiter" value={s.delimiter} options={[{ value: "auto", label: "Detect" }, ...delimiters]} onChange={(delimiter) => set({ delimiter })} />
        {indentSelect(s, set)}
      </Row>
      <Row>
        <Check label="First row is the header" checked={s.header} onChange={(header) => set({ header })} />
        <Check label="Convert numbers and true/false" checked={s.types} onChange={(types) => set({ types })} />
      </Row>
    </>
  ),
);

const jsonToYaml = convert(
  "JSON",
  '{"name": "Privora", "tools": ["pdf", "image"]}',
  async (s) => ({ text: await data.jsonToYaml(s.input, s.indent === "4" ? 4 : 2), textLabel: "YAML", download: { name: "data.yaml", type: TXT } }),
  (s, set) => <SelectField label="Indent" value={s.indent} options={spaceIndents} onChange={(indent) => set({ indent })} />,
);

const yamlToJson = convert(
  "YAML",
  "name: Privora\ntools:\n  - pdf\n  - image",
  async (s) => ({ text: await data.yamlToJson(s.input, s.indent), textLabel: "JSON", download: { name: "data.json", type: "application/json" } }),
  indentSelect,
);

const jsonToXml = convert(
  "JSON",
  '{"note": {"@lang": "en", "to": "Ann", "body": "Hi"}}',
  (s) => ({ text: data.jsonToXml(s.input, s.indent, s.root), textLabel: "XML", download: { name: "data.xml", type: "application/xml" } }),
  (s, set) => (
    <Row>
      {indentSelect(s, set)}
      <TextInput label="Root element (when needed)" value={s.root} onChange={(root) => set({ root })} />
    </Row>
  ),
);

const xmlToJson = convert(
  "XML",
  '<note lang="en"><to>Ann</to><body>Hi</body></note>',
  (s) => ({ text: data.xmlToJson(s.input, s.indent), textLabel: "JSON", download: { name: "data.json", type: "application/json" } }),
  indentSelect,
);

// ── Encoders ─────────────────────────────────────────────────────────────────

interface CodecS {
  input: string;
  mode: "encode" | "decode";
  option: boolean;
}

const codec = (
  name: string,
  optionLabel: string,
  encode: (t: string, o: boolean) => string,
  decode: (t: string, o: boolean) => string,
  defaultOption = false,
) =>
  tool<CodecS>({
    initial: () => ({ input: "", mode: "encode", option: defaultOption }),
    textKeys: ["input"],
    Inputs: ({ s, set }) => (
      <>
        <SelectField
          label="Mode"
          value={s.mode}
          options={[
            { value: "encode", label: `Encode to ${name}` },
            { value: "decode", label: `Decode from ${name}` },
          ]}
          onChange={(mode) => set({ mode })}
        />
        <TextArea label={s.mode === "encode" ? "Text" : name} value={s.input} onChange={(input) => set({ input })} mono rows={8} />
        <Check label={optionLabel} checked={s.option} onChange={(option) => set({ option })} />
      </>
    ),
    compute: (s) => {
      if (!s.input) return null;
      const text = s.mode === "encode" ? encode(s.input, s.option) : decode(s.input, s.option);
      return { text, textLabel: s.mode === "encode" ? name : "Decoded text", download: { name: s.mode === "encode" ? "encoded.txt" : "decoded.txt", type: TXT } };
    },
  });

const base64 = codec("Base64", "URL-safe alphabet (- and _, no padding)", encodeBase64, (t) => decodeBase64(t));
const url = codec(
  "URL encoding",
  "Encode a whole URL (keep : / ? & =) · decode + as a space",
  (t, whole) => encodeUrl(t, whole ? "uri" : "component"),
  (t, plus) => decodeUrl(t, plus),
);
const entities = codec("HTML entities", "Encode every non-ASCII character too", encodeEntities, (t) => decodeEntities(t));

const jwt = tool<{ input: string }>({
  initial: () => ({ input: "" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => <TextArea label="JWT" value={s.input} onChange={(input) => set({ input })} mono rows={5} placeholder="eyJhbGciOi…" />,
  compute: (s) => {
    if (!s.input.trim()) return null;
    const d = decodeJwt(s.input);
    const now = Date.now();
    const exp = d.times.find((t) => t.claim === "exp");
    return {
      warning: "Decoded only. The signature has NOT been checked, so anyone could have written this token. Never trust its contents without verifying it on your server.",
      rows: [
        ["Algorithm", String(d.header.alg ?? "not set")],
        ...d.times.map((t): [string, string] => [{ iat: "Issued", nbf: "Not before", exp: "Expires" }[t.claim], `${t.date.toISOString()}`]),
        ...(exp ? [["Status", exp.date.getTime() < now ? "Expired" : "Not expired yet"] as [string, string]] : []),
      ],
      node: (
        <div className="grid gap-3">
          <Pre label="Header" text={JSON.stringify(d.header, null, 2)} />
          <Pre label="Payload" text={JSON.stringify(d.payload, null, 2)} />
        </div>
      ),
    };
  },
});

function Pre({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid gap-1">
      <h3 className="text-sm font-medium">{label}</h3>
      <pre tabIndex={0} aria-label={label} className="max-h-96 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{text}</pre>
    </div>
  );
}

// ── Generators ───────────────────────────────────────────────────────────────

const countOf = (v: string, max: number) => Math.min(max, Math.max(1, Math.floor(Number(v)) || 1));

const uuid = tool<{ version: "4" | "7"; count: string; upper: boolean; hyphens: boolean }>({
  initial: () => ({ version: "4", count: "5", upper: false, hyphens: true }),
  generator: true,
  Inputs: ({ s, set }) => (
    <>
      <Row>
        <SelectField
          label="Version"
          value={s.version}
          options={[
            { value: "4", label: "Version 4 (random)" },
            { value: "7", label: "Version 7 (time-ordered)" },
          ]}
          onChange={(version) => set({ version })}
        />
        <NumberInput label="How many (1–1,000)" value={s.count} onChange={(count) => set({ count })} className="w-28" />
      </Row>
      <Row>
        <Check label="Uppercase" checked={s.upper} onChange={(upper) => set({ upper })} />
        <Check label="Hyphens" checked={s.hyphens} onChange={(hyphens) => set({ hyphens })} />
      </Row>
    </>
  ),
  compute: (s) => {
    const list = Array.from({ length: countOf(s.count, 1000) }, () => {
      let u = s.version === "7" ? uuidV7() : uuidV4();
      if (!s.hyphens) u = u.replace(/-/g, "");
      return s.upper ? u.toUpperCase() : u;
    });
    return { text: list.join("\n"), textLabel: list.length === 1 ? "UUID" : "UUIDs", download: { name: "uuids.txt", type: TXT } };
  },
});

interface PwS {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  count: string;
}

const passwordTool = tool<PwS>({
  initial: () => ({ length: 20, upper: true, lower: true, digits: true, symbols: true, avoidAmbiguous: false, count: "1" }),
  generator: true,
  Inputs: ({ s, set }) => (
    <>
      <RangeField label="Length" value={s.length} min={4} max={128} onChange={(length) => set({ length })} />
      <Row>
        <Check label="Uppercase (A–Z)" checked={s.upper} onChange={(upper) => set({ upper })} />
        <Check label="Lowercase (a–z)" checked={s.lower} onChange={(lower) => set({ lower })} />
        <Check label="Numbers (0–9)" checked={s.digits} onChange={(digits) => set({ digits })} />
        <Check label="Symbols (!@#…)" checked={s.symbols} onChange={(symbols) => set({ symbols })} />
      </Row>
      <Row>
        <Check label="Avoid look-alikes (I, l, 1, O, 0, o)" checked={s.avoidAmbiguous} onChange={(avoidAmbiguous) => set({ avoidAmbiguous })} />
        <NumberInput label="How many (1–100)" value={s.count} onChange={(count) => set({ count })} className="w-28" />
      </Row>
    </>
  ),
  compute: (s) => {
    if (!s.upper && !s.lower && !s.digits && !s.symbols) throw new InputError("Choose at least one character type.");
    const list = Array.from({ length: countOf(s.count, 100) }, () => password(s));
    const bits = entropyBits(s.length, passwordPool(s));
    return {
      note: `Strength: ${strengthLabel(bits)} (about ${Math.round(bits)} bits of randomness). Made with your browser's secure random generator, and never stored or sent.`,
      text: list.join("\n"),
      textLabel: list.length === 1 ? "Password" : "Passwords",
    };
  },
});

const CHARSETS: Record<string, string> = {
  alnum: SETS.upper + SETS.lower + SETS.digits,
  letters: SETS.upper + SETS.lower,
  lower: SETS.lower + SETS.digits,
  digits: SETS.digits,
  hex: SETS.hex,
};

const randomStringTool = tool<{ length: string; charset: string; custom: string; count: string }>({
  initial: () => ({ length: "16", charset: "alnum", custom: "", count: "5" }),
  generator: true,
  Inputs: ({ s, set }) => (
    <>
      <Row>
        <NumberInput label="Length (1–1,024)" value={s.length} onChange={(length) => set({ length })} className="w-28" />
        <NumberInput label="How many (1–1,000)" value={s.count} onChange={(count) => set({ count })} className="w-28" />
      </Row>
      <SelectField
        label="Characters"
        value={s.charset}
        options={[
          { value: "alnum", label: "Letters and numbers" },
          { value: "letters", label: "Letters only" },
          { value: "lower", label: "Lowercase and numbers" },
          { value: "digits", label: "Numbers only" },
          { value: "hex", label: "Hexadecimal (0–9, a–f)" },
          { value: "custom", label: "Custom" },
        ]}
        onChange={(charset) => set({ charset })}
      />
      {s.charset === "custom" && <TextInput label="Custom characters" value={s.custom} onChange={(custom) => set({ custom })} />}
    </>
  ),
  compute: (s) => {
    const alphabet = s.charset === "custom" ? s.custom : CHARSETS[s.charset];
    if (!alphabet) throw new InputError("Enter at least one custom character.");
    const list = Array.from({ length: countOf(s.count, 1000) }, () => randomString(countOf(s.length, 1024), alphabet));
    return { text: list.join("\n"), textLabel: "Random strings", download: { name: "random-strings.txt", type: TXT } };
  },
});

// ── Hashes ───────────────────────────────────────────────────────────────────

const ALGOS = Object.keys(HASH_LABELS) as HashAlgorithm[];

const hashTool = tool<{ input: string; upper: boolean }>({
  initial: () => ({ input: "", upper: false }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={6} />
      <Check label="Uppercase hex" checked={s.upper} onChange={(upper) => set({ upper })} />
    </>
  ),
  compute: async (s) => {
    const h = await hashText(s.input, ALGOS);
    return {
      note: "Hashes of the text's UTF-8 bytes. MD5, SHA-1 and CRC32 are fine for checksums but not for security.",
      rows: ALGOS.map((a) => [`${HASH_LABELS[a]}${WEAK.has(a) ? " (weak)" : ""}`, s.upper ? h[a].toUpperCase() : h[a]]),
      copyRows: true,
    };
  },
});

// ── QR code ──────────────────────────────────────────────────────────────────

interface QrS {
  input: string;
  ecc: "L" | "M" | "Q" | "H";
  size: number;
  fg: string;
  bg: string;
}

function qrSvg(matrix: boolean[][], fg: string, bg: string): string {
  const n = matrix.length;
  let path = "";
  matrix.forEach((row, y) => row.forEach((on, x) => on && (path += `M${x} ${y}h1v1h-1z`)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
}

function QrView({ svg, size, matrix, fg, bg }: { svg: string; size: number; matrix: boolean[][]; fg: string; bg: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [svg]);
  const png = () => {
    const n = matrix.length, scale = Math.max(1, Math.floor(size / n));
    const c = document.createElement("canvas");
    c.width = c.height = n * scale;
    const g = c.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg;
    matrix.forEach((row, y) => row.forEach((on, x) => on && g.fillRect(x * scale, y * scale, scale, scale)));
    c.toBlob((b) => b && downloadBlob(b, "qr-code.png"), "image/png");
  };
  return (
    <div className="grid gap-3">
      {url && <img src={url} alt="QR code" width={240} height={240} className="size-60 rounded-md border border-border" style={{ imageRendering: "pixelated" }} />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={png}>
          Download PNG
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg")}>
          Download SVG
        </Button>
      </div>
    </div>
  );
}

const qrGenerator = tool<QrS>({
  initial: () => ({ input: "", ecc: "M", size: 512, fg: "#000000", bg: "#ffffff" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text or link" value={s.input} onChange={(input) => set({ input })} rows={4} placeholder="https://tools.abrahamdan.com" />
      <Row>
        <SelectField
          label="Error correction"
          value={s.ecc}
          options={[
            { value: "L", label: "Low (7%)" },
            { value: "M", label: "Medium (15%)" },
            { value: "Q", label: "Quartile (25%)" },
            { value: "H", label: "High (30%)" },
          ]}
          onChange={(ecc) => set({ ecc })}
        />
        <ColourInput label="Colour" value={s.fg} onChange={(fg) => set({ fg })} />
        <ColourInput label="Background" value={s.bg} onChange={(bg) => set({ bg })} />
      </Row>
      <RangeField label="PNG size" value={s.size} min={128} max={2048} step={64} format={(v) => `about ${v} px`} onChange={(size) => set({ size })} />
    </>
  ),
  compute: async (s) => {
    if (!s.input) return null;
    const { encode } = await import("uqr");
    let qr;
    try {
      qr = encode(s.input, { ecc: s.ecc, border: 4 });
    } catch {
      throw new InputError("This is too long for a QR code. Shorten the text or lower the error correction.");
    }
    const c = contrast(parseColour(s.fg), parseColour(s.bg));
    return {
      warning: c < 3 ? "The colours are too similar: many phones won't be able to scan this code." : undefined,
      // qr.size includes the 4-module quiet zone on each side.
      note: `Version ${qr.version}, ${qr.size - 8} × ${qr.size - 8} modules. Test it with your phone before printing.`,
      node: <QrView svg={qrSvg(qr.data, s.fg, s.bg)} matrix={qr.data} size={s.size} fg={s.fg} bg={s.bg} />,
    };
  },
});

// ── Slug, cron ───────────────────────────────────────────────────────────────

const slugTool = tool<{ input: string; separator: "-" | "_"; lowercase: boolean; maxLength: string }>({
  initial: () => ({ input: "", separator: "-", lowercase: true, maxLength: "" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text (one slug per line)" value={s.input} onChange={(input) => set({ input })} rows={5} placeholder="Crème Brûlée Recipe — Easy & Quick!" />
      <Row>
        <SelectField
          label="Separator"
          value={s.separator}
          options={[
            { value: "-", label: "Hyphen (-)" },
            { value: "_", label: "Underscore (_)" },
          ]}
          onChange={(separator) => set({ separator })}
        />
        <NumberInput label="Maximum length (optional)" value={s.maxLength} onChange={(maxLength) => set({ maxLength })} className="w-28" />
      </Row>
      <Check label="Lowercase" checked={s.lowercase} onChange={(lowercase) => set({ lowercase })} />
    </>
  ),
  compute: (s) => {
    if (!s.input.trim()) return null;
    const text = s.input
      .split(/\r?\n/)
      .map((l) => slugify(l, { separator: s.separator, lowercase: s.lowercase, maxLength: Math.max(0, Math.floor(Number(s.maxLength)) || 0) }))
      .join("\n");
    return { text, textLabel: "Slugs" };
  },
});

interface CronS extends CronBuilder {
  expression: string;
}

const cronPresets: [string, string][] = [
  ["Every minute", "* * * * *"],
  ["Every 15 minutes", "*/15 * * * *"],
  ["Every hour", "0 * * * *"],
  ["Every day at midnight", "0 0 * * *"],
  ["Weekdays at 9:00", "0 9 * * 1-5"],
  ["Every Sunday at 3:30", "30 3 * * 0"],
  ["First day of every month", "0 0 1 * *"],
];

const cronTool = tool<CronS>({
  initial: () => ({ minute: "0", hour: "9", dom: "*", month: "*", dow: "1-5", expression: "0 9 * * 1-5" }),
  Inputs: ({ s, set }) => {
    const field = (k: keyof CronBuilder) => (v: string) => {
      const next = { ...s, [k]: v };
      set({ [k]: v, expression: buildCron(next) });
    };
    return (
      <>
        <SelectField
          label="Start from a preset"
          value={cronPresets.find(([, e]) => e === s.expression)?.[1] ?? "custom"}
          options={[...cronPresets.map(([label, value]) => ({ value, label })), { value: "custom", label: "Custom" }]}
          onChange={(e) => {
            if (e === "custom") return;
            const [minute, hour, dom, month, dow] = e.split(" ");
            set({ minute, hour, dom, month, dow, expression: e });
          }}
        />
        <Row>
          <TextInput label="Minute (0–59)" value={s.minute} onChange={field("minute")} className="w-24" />
          <TextInput label="Hour (0–23)" value={s.hour} onChange={field("hour")} className="w-24" />
          <TextInput label="Day of month (1–31)" value={s.dom} onChange={field("dom")} className="w-24" />
          <TextInput label="Month (1–12)" value={s.month} onChange={field("month")} className="w-24" />
          <TextInput label="Day of week (0–6, Sun = 0)" value={s.dow} onChange={field("dow")} className="w-24" />
        </Row>
        <TextInput
          label="Cron expression"
          value={s.expression}
          onChange={(expression) => {
            const p = expression.trim().split(/\s+/);
            set(p.length === 5 ? { expression, minute: p[0], hour: p[1], dom: p[2], month: p[3], dow: p[4] } : { expression });
          }}
          hint="Use * for any, 1-5 for a range, 1,15 for a list and */10 for every 10th. Paste an expression to explain it."
          className="font-mono sm:w-96"
        />
      </>
    );
  },
  compute: async (s) => {
    const c = parseCron(s.expression);
    const { default: cronstrue } = await import("cronstrue");
    const runs = nextRuns(c, new Date(), 5);
    return {
      rows: [
        ["Expression", s.expression.trim()],
        ["Meaning", cronstrue.toString(s.expression.trim(), { use24HourTimeFormat: true, verbose: true })],
        ...runs.map((d, i): [string, string] => [`Run ${i + 1}`, d.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })]),
      ],
      note: "Next runs are in your device's time zone. Servers often run cron in UTC, so check your scheduler's time zone.",
    };
  },
});

// ── Regex ────────────────────────────────────────────────────────────────────

interface RegexS {
  pattern: string;
  g: boolean;
  i: boolean;
  m: boolean;
  s: boolean;
  u: boolean;
  text: string;
  replace: string;
  doReplace: boolean;
}

function Highlight({ text, matches }: { text: string; matches: RegexMatch[] }) {
  const parts: ReactNode[] = [];
  let last = 0;
  matches.forEach((m, k) => {
    if (m.index < last) return;
    parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={k} className="rounded-sm bg-warning-soft px-0.5 text-foreground outline outline-1 outline-warning">
        {m.text || "∅"}
      </mark>,
    );
    last = m.index + m.text.length;
  });
  parts.push(text.slice(last));
  return <pre tabIndex={0} aria-label="Matches highlighted" className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-sm">{parts}</pre>;
}

const regexTool = tool<RegexS>({
  initial: () => ({ pattern: "", g: true, i: false, m: false, s: false, u: true, text: "", replace: "", doReplace: false }),
  textKeys: ["text"],
  Inputs: ({ s, set }) => (
    <>
      <TextInput label="Regular expression" value={s.pattern} onChange={(pattern) => set({ pattern })} placeholder="(\d{4})-(\d{2})-(\d{2})" className="font-mono sm:w-96" />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Flags</legend>
        <Row>
          <Check label="g: all matches" checked={s.g} onChange={(g) => set({ g })} />
          <Check label="i: ignore case" checked={s.i} onChange={(i) => set({ i })} />
          <Check label="m: ^ and $ per line" checked={s.m} onChange={(m) => set({ m })} />
          <Check label="s: . matches newlines" checked={s.s} onChange={(v) => set({ s: v })} />
          <Check label="u: Unicode" checked={s.u} onChange={(u) => set({ u })} />
        </Row>
      </fieldset>
      <TextArea label="Test text" value={s.text} onChange={(text) => set({ text })} rows={8} mono />
      <Check label="Replace matches" checked={s.doReplace} onChange={(doReplace) => set({ doReplace })} />
      {s.doReplace && <TextInput label="Replace with ($1, $<name>, $& allowed)" value={s.replace} onChange={(replace) => set({ replace })} className="font-mono sm:w-96" />}
    </>
  ),
  compute: async (s) => {
    if (!s.pattern) return null;
    const flags = (["g", "i", "m", "s", "u"] as const).filter((f) => s[f]).join("");
    if (s.doReplace) {
      const r = await runRegex({ pattern: s.pattern, flags, text: s.text, replace: s.replace });
      if (r.kind !== "replace") return null;
      return { note: `${r.count} ${r.count === 1 ? "replacement" : "replacements"}.`, text: r.text, textLabel: "Result", download: { name: "replaced.txt", type: TXT } };
    }
    const r = await runRegex({ pattern: s.pattern, flags, text: s.text });
    if (r.kind !== "matches") return null;
    return {
      note: `${r.total} ${r.total === 1 ? "match" : "matches"}${r.total > MAX_MATCHES ? ` (first ${MAX_MATCHES.toLocaleString("en-US")} shown)` : ""}. Runs in a separate thread and stops after 2 seconds.`,
      node: (
        <div className="grid gap-3">
          <Highlight text={s.text} matches={r.matches} />
          {r.matches.length > 0 && (
            <div tabIndex={0} role="region" aria-label="Match list" className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 font-medium">#</th>
                    <th className="p-2 font-medium">Position</th>
                    <th className="p-2 font-medium">Match</th>
                    <th className="p-2 font-medium">Groups</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.matches.slice(0, 200).map((m, k) => (
                    <tr key={k} className="border-b border-border align-top">
                      <td className="p-2">{k + 1}</td>
                      <td className="p-2">{m.index}</td>
                      <td className="break-all p-2">{m.text}</td>
                      <td className="break-all p-2">
                        {m.named
                          ? Object.entries(m.named).map(([k2, v]) => `${k2}: ${v ?? "—"}`).join(", ")
                          : m.groups.map((g, gi) => `$${gi + 1}: ${g ?? "—"}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    };
  },
});

// ── Time ─────────────────────────────────────────────────────────────────────

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function ZoneSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const zones = timeZones();
  return <SelectField label="Show in time zone" value={value} options={(zones.includes(value) ? zones : [value, ...zones]).map((z) => ({ value: z, label: z.replace(/_/g, " ") }))} onChange={onChange} />;
}

const timestampTool = tool<{ input: string; unit: TimestampUnit; zone: string; date: string }>({
  initial: () => ({ input: String(Math.floor(Date.now() / 1000)), unit: "auto", zone, date: "" }),
  Inputs: ({ s, set }) => (
    <>
      <Row>
        <TextInput label="Unix timestamp" value={s.input} onChange={(input) => set({ input })} inputMode="numeric" className="font-mono sm:w-60" />
        <SelectField
          label="Unit"
          value={s.unit}
          options={[
            { value: "auto", label: "Detect" },
            { value: "s", label: "Seconds" },
            { value: "ms", label: "Milliseconds" },
          ]}
          onChange={(unit) => set({ unit })}
        />
        <Button variant="outline" onClick={() => set({ input: String(Math.floor(Date.now() / 1000)), unit: "s" })}>
          Now
        </Button>
      </Row>
      <ZoneSelect value={s.zone} onChange={(z) => set({ zone: z })} />
      <TextInput label="Or convert a date and time to a timestamp" type="datetime-local" value={s.date} onChange={(date) => set({ date })} hint="Read in your device's time zone." />
    </>
  ),
  compute: (s) => {
    const rows: [string, string][] = [];
    if (s.input.trim()) {
      const { date, unit } = fromTimestamp(s.input, s.unit);
      rows.push(["Read as", unit === "s" ? "Seconds" : "Milliseconds"], ...dateFormats(date, s.zone).filter(([k]) => !k.startsWith("Unix")));
    }
    if (s.date) {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime())) throw new InputError("Choose a valid date and time.");
      rows.push(["Date as Unix seconds", String(Math.floor(d.getTime() / 1000))], ["Date as Unix milliseconds", String(d.getTime())]);
    }
    return rows.length ? { rows, copyRows: true } : null;
  },
});

const dateFormatTool = tool<{ input: string; zone: string }>({
  initial: () => ({ input: new Date().toISOString().slice(0, 19) + "Z", zone }),
  Inputs: ({ s, set }) => (
    <>
      <TextInput
        label="Date and time"
        value={s.input}
        onChange={(input) => set({ input })}
        className="font-mono sm:w-96"
        hint="ISO 8601 (2026-11-27T14:30:00Z), RFC 2822 (Fri, 27 Nov 2026 14:30:00 +0000), a Unix timestamp, or now."
      />
      <ZoneSelect value={s.zone} onChange={(z) => set({ zone: z })} />
    </>
  ),
  compute: (s) => (s.input.trim() ? { rows: dateFormats(parseDate(s.input), s.zone), copyRows: true, note: "Dates without a time zone are read in your device's time zone." } : null),
});

// ── Markdown ─────────────────────────────────────────────────────────────────

const markdownPreview = tool<{ input: string }>({
  initial: () => ({ input: "" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => <TextArea label="Markdown" value={s.input} onChange={(input) => set({ input })} rows={12} mono placeholder={"# Title\n\nSome **bold** text and a [link](https://example.com)."} />,
  compute: async (s) => {
    if (!s.input.trim()) return null;
    const r = await renderMarkdown(s.input);
    return { node: <MarkdownPreview fragment={r.fragment} blocked={r.blockedImages} />, text: r.html, textLabel: "HTML (sanitised)", download: { name: "preview.html", type: "text/html" } };
  },
});

// ── Colour ───────────────────────────────────────────────────────────────────

function Swatch({ c }: { c: Rgba }) {
  return <div aria-hidden className="h-20 w-full max-w-60 rounded-md border border-border" style={{ background: toRgb(c) }} />;
}

const colourTool = (start: string) =>
  tool<{ input: string }>({
    initial: () => ({ input: start }),
    Inputs: ({ s, set }) => {
      let hex = "#000000";
      try {
        hex = toHex({ ...parseColour(s.input), a: 1 });
      } catch {
        // Keep the picker on black while the text is incomplete.
      }
      return (
        <Row>
          <TextInput label="Colour (HEX, RGB or HSL)" value={s.input} onChange={(input) => set({ input })} className="font-mono sm:w-72" />
          <ColourInput label="Pick" value={hex} onChange={(input) => set({ input })} />
        </Row>
      );
    },
    compute: (s) => {
      if (!s.input.trim()) return null;
      const c = parseColour(s.input);
      const white = { r: 255, g: 255, b: 255, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 };
      return {
        node: <Swatch c={c} />,
        rows: [
          ["HEX", toHex(c)],
          ["RGB", toRgb(c)],
          ["HSL", toHsl(c)],
          ["HSV", toHsv(c)],
          ["CMYK (approximate)", toCmyk(c)],
          ["Contrast with white", `${contrast(c, white)}:1`],
          ["Contrast with black", `${contrast(c, black)}:1`],
        ],
        copyRows: true,
      };
    },
  });

interface GradientS {
  type: "linear" | "radial" | "conic";
  angle: number;
  c1: string;
  c2: string;
  c3: string;
  useC3: boolean;
}

const gradientTool = tool<GradientS>({
  initial: () => ({ type: "linear", angle: 90, c1: "#4f46e5", c2: "#06b6d4", c3: "#22c55e", useC3: false }),
  Inputs: ({ s, set }) => (
    <>
      <SelectField
        label="Type"
        value={s.type}
        options={[
          { value: "linear", label: "Linear" },
          { value: "radial", label: "Radial" },
          { value: "conic", label: "Conic" },
        ]}
        onChange={(type) => set({ type })}
      />
      {s.type !== "radial" && <RangeField label="Angle" value={s.angle} min={0} max={360} format={(v) => `${v}°`} onChange={(angle) => set({ angle })} />}
      <Row>
        <ColourInput label="Start colour" value={s.c1} onChange={(c1) => set({ c1 })} />
        <ColourInput label="End colour" value={s.c2} onChange={(c2) => set({ c2 })} />
        {s.useC3 && <ColourInput label="Third colour" value={s.c3} onChange={(c3) => set({ c3 })} />}
      </Row>
      <Check label="Add a third colour" checked={s.useC3} onChange={(useC3) => set({ useC3 })} />
    </>
  ),
  compute: (s) => {
    const stops = [s.c1, ...(s.useC3 ? [s.c3] : []), s.c2].join(", ");
    const value = s.type === "linear" ? `linear-gradient(${s.angle}deg, ${stops})` : s.type === "radial" ? `radial-gradient(circle, ${stops})` : `conic-gradient(from ${s.angle}deg, ${stops})`;
    return {
      node: <div aria-hidden className="h-40 w-full rounded-md border border-border" style={{ backgroundImage: value }} />,
      text: `background-image: ${value};`,
      textLabel: "CSS",
    };
  },
});

interface ShadowS {
  x: number;
  y: number;
  blur: number;
  spread: number;
  colour: string;
  opacity: number;
  inset: boolean;
}

const shadowTool = tool<ShadowS>({
  initial: () => ({ x: 0, y: 8, blur: 24, spread: -4, colour: "#0f172a", opacity: 25, inset: false }),
  Inputs: ({ s, set }) => (
    <>
      <RangeField label="Horizontal offset" value={s.x} min={-50} max={50} format={(v) => `${v} px`} onChange={(x) => set({ x })} />
      <RangeField label="Vertical offset" value={s.y} min={-50} max={50} format={(v) => `${v} px`} onChange={(y) => set({ y })} />
      <RangeField label="Blur" value={s.blur} min={0} max={100} format={(v) => `${v} px`} onChange={(blur) => set({ blur })} />
      <RangeField label="Spread" value={s.spread} min={-50} max={50} format={(v) => `${v} px`} onChange={(spread) => set({ spread })} />
      <Row>
        <ColourInput label="Shadow colour" value={s.colour} onChange={(colour) => set({ colour })} />
        <RangeField label="Opacity" value={s.opacity} min={0} max={100} format={(v) => `${v}%`} onChange={(opacity) => set({ opacity })} />
      </Row>
      <Check label="Inner shadow (inset)" checked={s.inset} onChange={(inset) => set({ inset })} />
    </>
  ),
  compute: (s) => {
    const { r, g, b } = parseColour(s.colour);
    const value = `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px rgba(${r}, ${g}, ${b}, ${s.opacity / 100})`;
    return {
      node: (
        <div className="grid place-items-center rounded-md border border-border bg-[#f1f5f9] p-10">
          <div aria-hidden className="size-32 rounded-xl bg-white" style={{ boxShadow: value }} />
        </div>
      ),
      text: `box-shadow: ${value};`,
      textLabel: "CSS",
    };
  },
});

export const devConfigs: Record<string, AnyFormTool> = {
  "json-formatter": jsonFormatter,
  "json-validator": jsonValidator,
  "json-minifier": jsonMinifier,
  "xml-formatter": xmlFormatter,
  "html-formatter": codeTool("HTML", [{ value: "html", label: "HTML" }], "<div><p>Hello</p><ul><li>One</li><li>Two</li></ul></div>"),
  "css-formatter": codeTool(
    "CSS",
    [
      { value: "css", label: "CSS" },
      { value: "scss", label: "SCSS" },
      { value: "less", label: "Less" },
    ],
    ".card{display:flex;gap:1rem}.card a{color:red}",
  ),
  "javascript-formatter": codeTool(
    "JavaScript",
    [
      { value: "javascript", label: "JavaScript" },
      { value: "typescript", label: "TypeScript" },
    ],
    "function add(a,b){return a+b}const total=[1,2,3].reduce(add,0)",
    true,
  ),
  "sql-formatter": sqlFormatter,
  "yaml-formatter": yamlFormatter,
  "base64-encoder-decoder": base64,
  "url-encoder-decoder": url,
  "html-entity-encoder-decoder": entities,
  "jwt-decoder": jwt,
  "uuid-generator": uuid,
  "password-generator": passwordTool,
  "random-string-generator": randomStringTool,
  "hash-generator": hashTool,
  "qr-code-generator": qrGenerator,
  "slug-generator": slugTool,
  "cron-expression-generator": cronTool,
  "json-to-csv": jsonToCsv,
  "csv-to-json": csvToJson,
  "json-to-yaml": jsonToYaml,
  "yaml-to-json": yamlToJson,
  "json-to-xml": jsonToXml,
  "xml-to-json": xmlToJson,
  "regex-tester": regexTool,
  "unix-timestamp-converter": timestampTool,
  "date-format-converter": dateFormatTool,
  "markdown-preview": markdownPreview,
  "colour-converter": colourTool("#4f46e5"),
  "hex-to-rgb": colourTool("#ff8800"),
  "rgb-to-hex": colourTool("rgb(255, 136, 0)"),
  "css-gradient-generator": gradientTool,
  "css-shadow-generator": shadowTool,
};

