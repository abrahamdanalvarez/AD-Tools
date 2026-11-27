// Pure text helpers for the text tools. No DOM, so they're unit-tested in Node.

/** Largest input the text tools accept (characters). Keeps the page responsive on phones. */
export const MAX_TEXT = 5_000_000;

const segmenter = (granularity: "word" | "sentence" | "grapheme") =>
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity }) : null;

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
}

/** Counts characters as users see them (an emoji or accented letter is one). */
export function countGraphemes(text: string): number {
  const seg = segmenter("grapheme");
  if (!seg) return [...text].length;
  let n = 0;
  for (const _ of seg.segment(text)) n++;
  return n;
}

export function countWords(text: string): number {
  const seg = segmenter("word");
  if (!seg) return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  let n = 0;
  for (const s of seg.segment(text)) if (s.isWordLike) n++;
  return n;
}

export function countSentences(text: string): number {
  // Sentences end with . ! ? or their CJK forms, followed by space or the end.
  return text.match(/[^.!?。！？\s][^.!?。！？]*?(?:[.!?。！？]+(?=\s|$)|$)/gu)?.filter((s) => /[\p{L}\p{N}]/u.test(s)).length ?? 0;
}

export function stats(text: string): TextStats {
  return {
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s+/g, "")),
    words: countWords(text),
    sentences: countSentences(text),
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
  };
}

/** Minutes to read or speak `words` at `wpm`, rounded up to whole seconds. */
export function readingSeconds(words: number, wpm: number): number {
  return Math.ceil((words / wpm) * 60);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  if (m < 60) return s ? `${m} min ${s} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

// ── Case ─────────────────────────────────────────────────────────────────────

export type TextCase = "upper" | "lower" | "title" | "sentence" | "camel" | "pascal" | "snake" | "kebab" | "constant" | "alternating" | "inverse";

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "via", "vs"]);

const words = (text: string) => text.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function convertCase(text: string, to: TextCase): string {
  switch (to) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      // Capitalise each word except small words in the middle of a line.
      return text.replace(/[^\r\n]+/g, (line) => {
        let index = 0;
        return line.toLowerCase().replace(/\p{L}[\p{L}\p{N}'’]*/gu, (w, offset: number) => {
          const first = index++ === 0, last = offset + w.length >= line.trimEnd().length;
          return !first && !last && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1);
        });
      });
    case "sentence":
      return text.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
    case "camel":
    case "pascal": {
      const out = words(text).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
      return to === "camel" ? out.charAt(0).toLowerCase() + out.slice(1) : out;
    }
    case "snake":
      return words(text).join("_").toLowerCase();
    case "kebab":
      return words(text).join("-").toLowerCase();
    case "constant":
      return words(text).join("_").toUpperCase();
    case "alternating": {
      let i = 0;
      return text.replace(/\p{L}/gu, (c) => (i++ % 2 ? c.toUpperCase() : c.toLowerCase()));
    }
    case "inverse":
      return [...text].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
  }
}

// ── Lines ────────────────────────────────────────────────────────────────────

export const splitLines = (text: string) => text.split(/\r\n|\r|\n/);

export function removeDuplicateLines(text: string, opts: { ignoreCase: boolean; trim: boolean; keepEmpty: boolean }): { text: string; removed: number } {
  const seen = new Set<string>();
  const lines = splitLines(text);
  const out = lines.filter((line) => {
    if (opts.keepEmpty && line.trim() === "") return true;
    let key = opts.trim ? line.trim() : line;
    if (opts.ignoreCase) key = key.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { text: out.join("\n"), removed: lines.length - out.length };
}

export type SortMode = "alpha" | "natural" | "numeric" | "length" | "random";

export function sortLines(text: string, opts: { mode: SortMode; descending: boolean; ignoreCase: boolean; removeEmpty: boolean }, random = Math.random): string {
  let lines = splitLines(text);
  if (opts.removeEmpty) lines = lines.filter((l) => l.trim() !== "");
  if (opts.mode === "random") {
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    return lines.join("\n");
  }
  const collator = new Intl.Collator(undefined, { sensitivity: opts.ignoreCase ? "base" : "variant", numeric: opts.mode === "natural" });
  const num = (s: string) => {
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
  };
  const cmp =
    opts.mode === "numeric"
      ? (a: string, b: string) => num(a) - num(b) || collator.compare(a, b)
      : opts.mode === "length"
        ? (a: string, b: string) => [...a].length - [...b].length || collator.compare(a, b)
        : collator.compare;
  lines.sort(cmp);
  if (opts.descending) lines.reverse();
  return lines.join("\n");
}

export type ReverseMode = "characters" | "words" | "lines";

export function reverseText(text: string, mode: ReverseMode): string {
  if (mode === "lines") return splitLines(text).reverse().join("\n");
  if (mode === "words") return splitLines(text).map((l) => l.split(/(\s+)/).reverse().join("")).join("\n");
  const seg = segmenter("grapheme");
  // Reverse by grapheme so emoji and accented letters stay intact.
  return seg ? Array.from(seg.segment(text), (s) => s.segment).reverse().join("") : [...text].reverse().join("");
}

export function removeExtraSpaces(text: string, opts: { trimLines: boolean; keepLineBreaks: boolean }): string {
  let out = opts.keepLineBreaks ? text.replace(/[^\S\r\n]+/g, " ") : text.replace(/\s+/g, " ");
  if (opts.trimLines) out = splitLines(out).map((l) => l.trim()).join("\n");
  return opts.keepLineBreaks ? out : out.trim();
}

export function removeEmptyLines(text: string, whitespaceOnly: boolean): { text: string; removed: number } {
  const lines = splitLines(text);
  const out = lines.filter((l) => (whitespaceOnly ? l.trim() !== "" : l !== ""));
  return { text: out.join("\n"), removed: lines.length - out.length };
}

export interface CleanOptions {
  invisible: boolean;
  smartQuotes: boolean;
  dashes: boolean;
  nbsp: boolean;
  tabs: boolean;
  extraSpaces: boolean;
  trimLines: boolean;
  emptyLines: boolean;
  htmlTags: boolean;
}

/** Zero-width and other invisible formatting characters (not ordinary spaces). */
const INVISIBLE = /[​-‍⁠﻿­‪-‮⁦-⁩]/g;

export function cleanText(text: string, o: CleanOptions): string {
  let t = text.replace(/\r\n?/g, "\n");
  if (o.htmlTags) t = t.replace(/<[^>]*>/g, "");
  if (o.invisible) t = t.replace(INVISIBLE, "");
  if (o.nbsp) t = t.replace(/[   ]/g, " ");
  if (o.smartQuotes) t = t.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"');
  if (o.dashes) t = t.replace(/[‒–—―]/g, "-").replace(/…/g, "...");
  if (o.tabs) t = t.replace(/\t/g, " ");
  if (o.extraSpaces) t = t.replace(/[^\S\n]{2,}/g, " ");
  if (o.trimLines) t = t.split("\n").map((l) => l.trim()).join("\n");
  if (o.emptyLines) t = t.replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
  return t;
}

/** Plain (non-regex) find and replace. Regex mode runs in a worker (see regex.ts). */
export function replacePlain(text: string, find: string, replace: string, ignoreCase: boolean, wholeWord: boolean): { text: string; count: number } {
  if (!find) return { text, count: 0 };
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(wholeWord ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])` : escaped, ignoreCase ? "giu" : "gu");
  let count = 0;
  const out = text.replace(re, () => {
    count++;
    return replace;
  });
  return { text: out, count };
}

export function slugify(text: string, opts: { separator: "-" | "_"; lowercase: boolean; maxLength: number }): string {
  let s = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/[đĐ]/g, "d")
    .replace(/[łŁ]/g, "l")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, opts.separator)
    .replace(new RegExp(`^\\${opts.separator}+|\\${opts.separator}+$`, "g"), "");
  if (opts.lowercase) s = s.toLowerCase();
  if (opts.maxLength > 0 && s.length > opts.maxLength) s = s.slice(0, opts.maxLength).replace(new RegExp(`\\${opts.separator}+$`), "");
  return s;
}

// ── Lorem ipsum ──────────────────────────────────────────────────────────────

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
    " ",
  );

/** Deterministic pseudo-random numbers, so a given seed always gives the same text. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lorem(opts: { unit: "paragraphs" | "sentences" | "words"; count: number; startWithLorem: boolean; seed: number }): string {
  const rnd = mulberry32(opts.seed);
  const pick = (n: number) => Array.from({ length: n }, () => LOREM[Math.floor(rnd() * LOREM.length)]);
  const sentence = () => {
    const w = pick(6 + Math.floor(rnd() * 10));
    return w.join(" ").replace(/^./, (c) => c.toUpperCase()) + ".";
  };
  const opener = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
  const count = Math.max(1, Math.min(opts.count, 1000));
  if (opts.unit === "words") {
    const w = pick(count);
    if (opts.startWithLorem) w.splice(0, Math.min(2, count), ...["lorem", "ipsum"].slice(0, count));
    return w.join(" ").replace(/^./, (c) => c.toUpperCase());
  }
  const sentences = (n: number) => Array.from({ length: n }, sentence);
  if (opts.unit === "sentences") {
    const s = sentences(count);
    if (opts.startWithLorem) s[0] = opener;
    return s.join(" ");
  }
  const paras = Array.from({ length: count }, () => sentences(4 + Math.floor(rnd() * 4)));
  if (opts.startWithLorem) paras[0][0] = opener;
  return paras.map((p) => p.join(" ")).join("\n\n");
}
