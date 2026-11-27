// JSON, CSV, YAML and XML conversions. XML uses the browser's DOMParser,
// which never loads external entities or DTDs. CSV and YAML are lazy-loaded.
import { InputError } from "./encode";

export type Indent = "2" | "4" | "tab";
const indentText = (i: Indent) => (i === "tab" ? "\t" : " ".repeat(Number(i)));

// ── JSON ─────────────────────────────────────────────────────────────────────

/** Line and column of a JSON.parse error, when the browser says where it is. */
export function jsonErrorPosition(text: string, message: string): { line: number; column: number } | null {
  const lc = message.match(/line (\d+) column (\d+)/i);
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) };
  const pos = message.match(/position (\d+)/i);
  if (!pos) return null;
  const before = text.slice(0, Number(pos[1])).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

export function parseJson(text: string): unknown {
  if (!text.trim()) throw new InputError("Enter some JSON.");
  try {
    return JSON.parse(text);
  } catch (err) {
    const msg = (err as Error).message;
    const at = jsonErrorPosition(text, msg);
    // Browsers word the reason differently; keep only the part before any position.
    const reason = msg.replace(/^JSON\.parse:\s*/, "").replace(/\s*(at|in JSON at) (line|position).*$/i, "").replace(/\s*\(line \d+ column \d+\)/, "");
    throw new InputError(`Invalid JSON${at ? ` at line ${at.line}, column ${at.column}` : ""}: ${reason}`);
  }
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}

export function formatJson(text: string, indent: Indent, sort: boolean): string {
  const v = parseJson(text);
  return JSON.stringify(sort ? sortKeys(v) : v, null, indentText(indent));
}

export const minifyJson = (text: string) => JSON.stringify(parseJson(text));

export function describeJson(v: unknown): string {
  if (Array.isArray(v)) return `an array of ${v.length} ${v.length === 1 ? "item" : "items"}`;
  if (v && typeof v === "object") {
    const n = Object.keys(v).length;
    return `an object with ${n} ${n === 1 ? "key" : "keys"}`;
  }
  return v === null ? "null" : `a ${typeof v}`;
}

// ── CSV ──────────────────────────────────────────────────────────────────────

/** Nested objects become dotted column names: {a: {b: 1}} → "a.b". Arrays are kept as JSON text. */
function flatten(v: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
    if (Object.keys(v).length === 0 && prefix) out[prefix] = "";
  } else out[prefix || "value"] = Array.isArray(v) ? JSON.stringify(v) : v;
  return out;
}

export async function jsonToCsv(text: string, delimiter: string): Promise<{ csv: string; rows: number; columns: number }> {
  const v = parseJson(text);
  const list = Array.isArray(v) ? v : [v];
  if (list.length === 0) throw new InputError("The JSON array is empty.");
  const rows = list.map((x) => flatten(x));
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const { default: Papa } = await import("papaparse");
  // Values that start with = + - @ could run as formulas in spreadsheets: prefix them with '.
  const safe = (x: unknown) => {
    const s = x === null || x === undefined ? "" : String(x);
    return /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  };
  const csv = Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => safe(r[c]))) }, { delimiter, newline: "\n" });
  return { csv, rows: rows.length, columns: columns.length };
}

export async function csvToJson(text: string, opts: { header: boolean; types: boolean; delimiter: string }): Promise<{ json: unknown[]; rows: number }> {
  if (!text.trim()) throw new InputError("Enter some CSV.");
  const { default: Papa } = await import("papaparse");
  const res = Papa.parse<unknown>(text.trim(), {
    header: opts.header,
    dynamicTyping: opts.types,
    skipEmptyLines: true,
    delimiter: opts.delimiter === "auto" ? "" : opts.delimiter,
  });
  const fatal = res.errors.find((e) => e.type === "Quotes");
  if (fatal) throw new InputError(`Invalid CSV at row ${(fatal.row ?? 0) + 1}: ${fatal.message}`);
  return { json: res.data, rows: res.data.length };
}

// ── YAML ─────────────────────────────────────────────────────────────────────

const yamlLib = () => import("yaml");

function yamlError(err: unknown): never {
  const e = err as { message?: string; linePos?: { line: number; col: number }[] };
  const pos = e.linePos?.[0];
  throw new InputError(`Invalid YAML${pos ? ` at line ${pos.line}, column ${pos.col}` : ""}: ${(e.message ?? "").split("\n")[0].replace(/ at line \d+, column \d+:?$/, "")}`);
}

export async function formatYaml(text: string, indent: 2 | 4): Promise<string> {
  if (!text.trim()) throw new InputError("Enter some YAML.");
  const { parseAllDocuments } = await yamlLib();
  const docs = parseAllDocuments(text);
  for (const d of docs) if (d.errors.length) yamlError(d.errors[0]);
  // Comments are kept. maxAliasCount (default 100) stops "billion laughs" alias bombs.
  return docs.map((d) => d.toString({ indent })).join("");
}

export async function yamlToJson(text: string, indent: Indent): Promise<string> {
  if (!text.trim()) throw new InputError("Enter some YAML.");
  const { parseAllDocuments } = await yamlLib();
  const docs = parseAllDocuments(text);
  const values = docs.map((d) => {
    if (d.errors.length) yamlError(d.errors[0]);
    try {
      return d.toJS({ maxAliasCount: 100 });
    } catch (err) {
      yamlError(err);
    }
  });
  return JSON.stringify(values.length === 1 ? values[0] : values, null, indentText(indent));
}

export async function jsonToYaml(text: string, indent: 2 | 4): Promise<string> {
  const v = parseJson(text);
  const { stringify } = await yamlLib();
  return stringify(v, { indent });
}

// ── XML ──────────────────────────────────────────────────────────────────────

export function parseXml(text: string): Document {
  if (!text.trim()) throw new InputError("Enter some XML.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) {
    // Chrome and Safari wrap the message in HTML; Firefox puts it in text.
    const msg = (err.querySelector("div")?.textContent ?? err.textContent ?? "").trim().split("\n")[0];
    throw new InputError(`Invalid XML: ${msg.replace(/^This page contains the following errors:\s*/i, "").replace(/^XML Parsing Error:\s*/i, "")}`);
  }
  return doc;
}

const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => escText(s).replace(/"/g, "&quot;");

export function formatXml(text: string, indent: Indent | "minify"): string {
  const doc = parseXml(text);
  const pad = indent === "minify" ? "" : indentText(indent);
  const nl = indent === "minify" ? "" : "\n";
  const decl = text.trimStart().match(/^<\?xml[^?]*\?>/)?.[0];
  const out: string[] = decl ? [decl] : [];

  const write = (node: Node, depth: number): string | null => {
    const ind = pad.repeat(depth);
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const el = node as Element;
        const attrs = Array.from(el.attributes, (a) => ` ${a.name}="${escAttr(a.value)}"`).join("");
        const kids = Array.from(el.childNodes).filter((c) => !(c.nodeType === Node.TEXT_NODE && !c.nodeValue!.trim()));
        if (kids.length === 0) return `${ind}<${el.tagName}${attrs}/>`;
        if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE)
          return `${ind}<${el.tagName}${attrs}>${escText(kids[0].nodeValue!.trim())}</${el.tagName}>`;
        const inner = kids.map((k) => write(k, depth + 1)).filter((x): x is string => x !== null);
        return `${ind}<${el.tagName}${attrs}>${nl}${inner.join(nl)}${nl}${ind}</${el.tagName}>`;
      }
      case Node.TEXT_NODE: {
        const t = node.nodeValue!.trim();
        return t ? ind + escText(t) : null;
      }
      case Node.CDATA_SECTION_NODE:
        return `${ind}<![CDATA[${node.nodeValue}]]>`;
      case Node.COMMENT_NODE:
        return `${ind}<!--${node.nodeValue}-->`;
      case Node.PROCESSING_INSTRUCTION_NODE: {
        const pi = node as ProcessingInstruction;
        return `${ind}<?${pi.target} ${pi.data}?>`;
      }
      case Node.DOCUMENT_TYPE_NODE:
        return ind + new XMLSerializer().serializeToString(node);
      default:
        return null;
    }
  };
  for (const n of Array.from(doc.childNodes)) {
    const s = write(n, 0);
    if (s !== null) out.push(s);
  }
  return out.join(nl) + (nl ? "\n" : "");
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Attributes become "@name", mixed text "#text"; repeated elements become arrays. */
function elementToJson(el: Element): Json {
  const obj: Record<string, Json> = {};
  for (const a of Array.from(el.attributes)) obj[`@${a.name}`] = a.value;
  let text = "";
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === Node.ELEMENT_NODE) {
      const child = c as Element;
      const v = elementToJson(child);
      const prev = obj[child.tagName];
      obj[child.tagName] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
    } else if (c.nodeType === Node.TEXT_NODE || c.nodeType === Node.CDATA_SECTION_NODE) text += c.nodeValue;
  }
  const t = text.trim();
  if (Object.keys(obj).length === 0) return t;
  if (t) obj["#text"] = t;
  return obj;
}

export function xmlToJson(text: string, indent: Indent): string {
  const root = parseXml(text).documentElement;
  return JSON.stringify({ [root.tagName]: elementToJson(root) }, null, indentText(indent));
}

/** XML names can't start with a digit, "xml" or punctuation, or contain spaces. */
const xmlName = (k: string) => {
  const n = k.replace(/[^\p{L}\p{N}_.:-]/gu, "_");
  return /^[\p{L}_]/u.test(n) && !/^xml/i.test(n) ? n : `_${n}`;
};

export function jsonToXml(text: string, indent: Indent, rootName: string): string {
  const v = parseJson(text);
  const pad = indentText(indent);
  const write = (name: string, value: unknown, depth: number): string => {
    const ind = pad.repeat(depth);
    const tag = xmlName(name);
    if (Array.isArray(value)) return value.map((x) => write(name, x, depth)).join("\n");
    if (value === null || value === undefined) return `${ind}<${tag}/>`;
    if (typeof value !== "object") return `${ind}<${tag}>${escText(String(value))}</${tag}>`;
    const entries = Object.entries(value);
    const attrs = entries.filter(([k]) => k.startsWith("@")).map(([k, x]) => ` ${xmlName(k.slice(1))}="${escAttr(String(x))}"`).join("");
    const textValue = entries.find(([k]) => k === "#text")?.[1];
    const kids = entries.filter(([k]) => !k.startsWith("@") && k !== "#text");
    if (kids.length === 0) return textValue === undefined ? `${ind}<${tag}${attrs}/>` : `${ind}<${tag}${attrs}>${escText(String(textValue))}</${tag}>`;
    const inner = [...(textValue !== undefined ? [pad.repeat(depth + 1) + escText(String(textValue))] : []), ...kids.map(([k, x]) => write(k, x, depth + 1))];
    return `${ind}<${tag}${attrs}>\n${inner.join("\n")}\n${ind}</${tag}>`;
  };
  const single = v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && !Object.keys(v)[0].startsWith("@");
  const body = single ? write(Object.keys(v as object)[0], Object.values(v as object)[0], 0) : write(rootName || "root", Array.isArray(v) ? { item: v } : v, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
}
