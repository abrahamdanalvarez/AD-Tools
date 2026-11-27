// Text tools: counters, case, lines, cleaning, diff, lorem ipsum, Markdown.
import { InputError } from "../core/encode";
import * as t from "../core/text";
import { renderMarkdown, htmlDocument } from "../markdown";
import { runRegex } from "../regex";
import { MarkdownPreview } from "./markdown-preview";
import { Check, NumberInput, RangeField, Row, SelectField, TextArea, TextInput } from "./fields";
import type { AnyFormTool, FormTool, Output } from "./shell";

const tool = <S,>(c: FormTool<S>) => c;
const TXT = { name: "text.txt", type: "text/plain" };
const n = (v: number) => v.toLocaleString("en-US");

// ── Counters ─────────────────────────────────────────────────────────────────

type Stat = keyof t.TextStats;
const STAT_LABELS: Record<Stat, string> = {
  words: "Words",
  characters: "Characters",
  charactersNoSpaces: "Characters without spaces",
  sentences: "Sentences",
  paragraphs: "Paragraphs",
  lines: "Lines",
};

const counter = (first: Stat) =>
  tool<{ input: string }>({
    initial: () => ({ input: "" }),
    textKeys: ["input"],
    Inputs: ({ s, set }) => <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={10} placeholder="Type or paste your text." />,
    compute: (s) => {
      const st = t.stats(s.input);
      const order: Stat[] = [first, ...(Object.keys(STAT_LABELS) as Stat[]).filter((k) => k !== first)];
      return {
        node: (
          <div className="grid gap-1">
            <p className="text-3xl font-bold" aria-live="polite">
              {n(st[first])} <span className="text-base font-medium text-muted-foreground">{STAT_LABELS[first].toLowerCase()}</span>
            </p>
          </div>
        ),
        rows: [
          ...order.slice(1).map((k): [string, string] => [STAT_LABELS[k], n(st[k])]),
          ["Reading time (238 wpm)", t.formatDuration(t.readingSeconds(st.words, 238))],
        ],
        note: "Characters are counted as you see them, so an emoji or accented letter counts as one.",
      };
    },
  });

// ── Case ─────────────────────────────────────────────────────────────────────

const CASES: { value: t.TextCase; label: string }[] = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
  { value: "camel", label: "camelCase" },
  { value: "pascal", label: "PascalCase" },
  { value: "snake", label: "snake_case" },
  { value: "kebab", label: "kebab-case" },
  { value: "constant", label: "CONSTANT_CASE" },
  { value: "alternating", label: "aLtErNaTiNg" },
  { value: "inverse", label: "iNVERSE cASE" },
];

const caseTool = (fixed?: t.TextCase) =>
  tool<{ input: string; to: t.TextCase }>({
    initial: () => ({ input: "", to: fixed ?? "title" }),
    textKeys: ["input"],
    Inputs: ({ s, set }) => (
      <>
        <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
        {!fixed && <SelectField label="Convert to" value={s.to} options={CASES} onChange={(to) => set({ to })} />}
      </>
    ),
    compute: (s) => (s.input ? { text: t.convertCase(s.input, s.to), textLabel: "Converted text", download: TXT } : null),
  });

// ── Lines ────────────────────────────────────────────────────────────────────

const dedupe = tool<{ input: string; ignoreCase: boolean; trim: boolean; keepEmpty: boolean }>({
  initial: () => ({ input: "", ignoreCase: false, trim: true, keepEmpty: false }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text (one item per line)" value={s.input} onChange={(input) => set({ input })} rows={10} />
      <Row>
        <Check label="Ignore case" checked={s.ignoreCase} onChange={(ignoreCase) => set({ ignoreCase })} />
        <Check label="Ignore spaces at the ends" checked={s.trim} onChange={(trim) => set({ trim })} />
        <Check label="Keep empty lines" checked={s.keepEmpty} onChange={(keepEmpty) => set({ keepEmpty })} />
      </Row>
    </>
  ),
  compute: (s) => {
    if (!s.input) return null;
    const r = t.removeDuplicateLines(s.input, s);
    return { note: `${n(r.removed)} duplicate ${r.removed === 1 ? "line" : "lines"} removed. The first copy of each line is kept, in order.`, text: r.text, textLabel: "Unique lines", download: TXT };
  },
});

const sorter = tool<{ input: string; mode: t.SortMode; descending: boolean; ignoreCase: boolean; removeEmpty: boolean }>({
  initial: () => ({ input: "", mode: "natural", descending: false, ignoreCase: true, removeEmpty: true }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text (one item per line)" value={s.input} onChange={(input) => set({ input })} rows={10} />
      <SelectField
        label="Sort"
        value={s.mode}
        options={[
          { value: "natural", label: "Natural (file2 before file10)" },
          { value: "alpha", label: "Alphabetical" },
          { value: "numeric", label: "By the first number in each line" },
          { value: "length", label: "By length" },
          { value: "random", label: "Shuffle" },
        ]}
        onChange={(mode) => set({ mode })}
      />
      <Row>
        {s.mode !== "random" && <Check label="Reverse order (Z–A)" checked={s.descending} onChange={(descending) => set({ descending })} />}
        {s.mode !== "random" && <Check label="Ignore case" checked={s.ignoreCase} onChange={(ignoreCase) => set({ ignoreCase })} />}
        <Check label="Remove empty lines" checked={s.removeEmpty} onChange={(removeEmpty) => set({ removeEmpty })} />
      </Row>
    </>
  ),
  compute: (s) => (s.input ? { text: t.sortLines(s.input, s), textLabel: "Sorted lines", download: TXT } : null),
});

const reverser = tool<{ input: string; mode: t.ReverseMode }>({
  initial: () => ({ input: "", mode: "characters" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
      <SelectField
        label="Reverse"
        value={s.mode}
        options={[
          { value: "characters", label: "Characters (txet → text)" },
          { value: "words", label: "Word order in each line" },
          { value: "lines", label: "Line order" },
        ]}
        onChange={(mode) => set({ mode })}
      />
    </>
  ),
  compute: (s) => (s.input ? { text: t.reverseText(s.input, s.mode), textLabel: "Reversed text", download: TXT } : null),
});

const spaces = tool<{ input: string; trimLines: boolean; keepLineBreaks: boolean }>({
  initial: () => ({ input: "", trimLines: true, keepLineBreaks: true }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
      <Row>
        <Check label="Keep line breaks" checked={s.keepLineBreaks} onChange={(keepLineBreaks) => set({ keepLineBreaks })} />
        <Check label="Trim spaces at the start and end of lines" checked={s.trimLines} onChange={(trimLines) => set({ trimLines })} />
      </Row>
    </>
  ),
  compute: (s) => (s.input ? { text: t.removeExtraSpaces(s.input, s), textLabel: "Cleaned text", download: TXT } : null),
});

const emptyLines = tool<{ input: string; whitespaceOnly: boolean }>({
  initial: () => ({ input: "", whitespaceOnly: true }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
      <Check label="Also remove lines with only spaces or tabs" checked={s.whitespaceOnly} onChange={(whitespaceOnly) => set({ whitespaceOnly })} />
    </>
  ),
  compute: (s) => {
    if (!s.input) return null;
    const r = t.removeEmptyLines(s.input, s.whitespaceOnly);
    return { note: `${n(r.removed)} empty ${r.removed === 1 ? "line" : "lines"} removed.`, text: r.text, textLabel: "Text", download: TXT };
  },
});

// ── Find and replace ─────────────────────────────────────────────────────────

interface FindS {
  input: string;
  find: string;
  replace: string;
  ignoreCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

const findReplace = tool<FindS>({
  initial: () => ({ input: "", find: "", replace: "", ignoreCase: false, wholeWord: false, regex: false }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
      <Row>
        <TextInput label="Find" value={s.find} onChange={(find) => set({ find })} />
        <TextInput label="Replace with" value={s.replace} onChange={(replace) => set({ replace })} />
      </Row>
      <Row>
        <Check label="Ignore case" checked={s.ignoreCase} onChange={(ignoreCase) => set({ ignoreCase })} />
        {!s.regex && <Check label="Whole words only" checked={s.wholeWord} onChange={(wholeWord) => set({ wholeWord })} />}
        <Check label="Regular expression" checked={s.regex} onChange={(regex) => set({ regex })} />
      </Row>
    </>
  ),
  compute: async (s): Promise<Output | null> => {
    if (!s.input || !s.find) return null;
    let r: { text: string; count: number };
    if (s.regex) {
      const res = await runRegex({ pattern: s.find, flags: s.ignoreCase ? "giu" : "gu", text: s.input, replace: s.replace });
      if (res.kind !== "replace") return null;
      r = res;
    } else r = t.replacePlain(s.input, s.find, s.replace, s.ignoreCase, s.wholeWord);
    return { note: `${n(r.count)} ${r.count === 1 ? "replacement" : "replacements"}.`, text: r.text, textLabel: "Result", download: TXT };
  },
});

// ── Cleaner ──────────────────────────────────────────────────────────────────

const CLEAN_LABELS: [keyof t.CleanOptions, string][] = [
  ["invisible", "Remove invisible characters (zero-width spaces, soft hyphens, direction marks)"],
  ["nbsp", "Turn non-breaking spaces into normal spaces"],
  ["smartQuotes", "Straighten curly quotes (“ ” ‘ ’)"],
  ["dashes", "Turn long dashes into hyphens and … into ..."],
  ["tabs", "Turn tabs into spaces"],
  ["extraSpaces", "Collapse repeated spaces"],
  ["trimLines", "Trim spaces at the start and end of lines"],
  ["emptyLines", "Collapse runs of empty lines"],
  ["htmlTags", "Remove HTML tags"],
];

const cleaner = tool<{ input: string } & t.CleanOptions>({
  initial: () => ({ input: "", invisible: true, nbsp: true, smartQuotes: false, dashes: false, tabs: false, extraSpaces: true, trimLines: true, emptyLines: true, htmlTags: false }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={8} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Clean up</legend>
        {CLEAN_LABELS.map(([k, label]) => (
          <Check key={k} label={label} checked={s[k]} onChange={(v) => set({ [k]: v })} />
        ))}
      </fieldset>
    </>
  ),
  compute: (s) => {
    if (!s.input) return null;
    const text = t.cleanText(s.input, s);
    const removed = s.input.length - text.length;
    return { note: removed > 0 ? `${n(removed)} characters removed.` : "Nothing to clean with these options.", text, textLabel: "Clean text", download: TXT };
  },
});

// ── Diff ─────────────────────────────────────────────────────────────────────

interface DiffS {
  a: string;
  b: string;
  mode: "lines" | "words" | "chars";
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
}

/** Diffing is quadratic in the worst case: keep it to sizes a phone handles quickly. */
const MAX_DIFF = 500_000;

const diffTool = tool<DiffS>({
  initial: () => ({ a: "", b: "", mode: "words", ignoreCase: false, ignoreWhitespace: false }),
  textKeys: ["a", "b"],
  Inputs: ({ s, set }) => (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Original text" value={s.a} onChange={(a) => set({ a })} rows={10} />
        <TextArea label="Changed text" value={s.b} onChange={(b) => set({ b })} rows={10} />
      </div>
      <Row>
        <SelectField
          label="Compare by"
          value={s.mode}
          options={[
            { value: "lines", label: "Lines" },
            { value: "words", label: "Words" },
            { value: "chars", label: "Characters" },
          ]}
          onChange={(mode) => set({ mode })}
        />
        <Check label="Ignore case" checked={s.ignoreCase} onChange={(ignoreCase) => set({ ignoreCase })} />
        <Check label="Ignore whitespace" checked={s.ignoreWhitespace} onChange={(ignoreWhitespace) => set({ ignoreWhitespace })} />
      </Row>
    </>
  ),
  compute: async (s) => {
    if (!s.a && !s.b) return null;
    if (s.a.length + s.b.length > MAX_DIFF) throw new InputError(`The texts are too long to compare here (over ${n(MAX_DIFF)} characters together).`);
    const d = await import("diff");
    const parts =
      s.mode === "lines"
        ? // ignoreCase works for lines too (base equals), but jsdiff's typings omit it.
          d.diffLines(s.a, s.b, { ignoreCase: s.ignoreCase, ignoreWhitespace: s.ignoreWhitespace } as Parameters<typeof d.diffLines>[2])
        : s.mode === "words"
          ? d.diffWordsWithSpace(s.a, s.b, { ignoreCase: s.ignoreCase })
          : d.diffChars(s.a, s.b, { ignoreCase: s.ignoreCase });
    let added = 0, removed = 0;
    for (const p of parts) {
      if (p.added) added += p.count ?? 0;
      if (p.removed) removed += p.count ?? 0;
    }
    const unit = { lines: "lines", words: "words", chars: "characters" }[s.mode];
    const patch = d.createTwoFilesPatch("original.txt", "changed.txt", s.a, s.b, "", "", { context: 3 });
    return {
      note: added || removed ? `${n(added)} ${unit} added, ${n(removed)} removed. Added text is underlined in green, removed text struck through in red.` : "The texts are identical.",
      node: (
        <pre tabIndex={0} aria-label="Differences" className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-sm">
          {parts.map((p, i) =>
            p.added ? (
              <ins key={i} className="bg-success-soft text-success-text underline">
                {p.value}
              </ins>
            ) : p.removed ? (
              <del key={i} className="bg-error-soft text-foreground line-through decoration-error-text">
                {p.value}
              </del>
            ) : (
              <span key={i}>{p.value}</span>
            ),
          )}
        </pre>
      ),
      text: patch,
      textLabel: "Unified diff (patch)",
      download: { name: "changes.diff", type: "text/plain" },
    };
  },
});

// ── Reading time, lorem, Markdown editor ─────────────────────────────────────

const readingTime = tool<{ input: string; wpm: number; speakWpm: number }>({
  initial: () => ({ input: "", wpm: 238, speakWpm: 150 }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => (
    <>
      <TextArea label="Text" value={s.input} onChange={(input) => set({ input })} rows={10} />
      <RangeField label="Reading speed" value={s.wpm} min={100} max={500} step={1} format={(v) => `${v} words per minute`} onChange={(wpm) => set({ wpm })} />
      <RangeField label="Speaking speed" value={s.speakWpm} min={80} max={250} step={1} format={(v) => `${v} words per minute`} onChange={(speakWpm) => set({ speakWpm })} />
    </>
  ),
  compute: (s) => {
    const words = t.countWords(s.input);
    return {
      node: (
        <p className="text-3xl font-bold">
          {t.formatDuration(t.readingSeconds(words, s.wpm))} <span className="text-base font-medium text-muted-foreground">to read</span>
        </p>
      ),
      rows: [
        ["Words", n(words)],
        ["Time to read aloud", t.formatDuration(t.readingSeconds(words, s.speakWpm))],
      ],
      note: "An estimate. Adults read about 238 words a minute on average (Brysbaert, 2019) and speak about 150. Technical text takes longer.",
    };
  },
});

const loremTool = tool<{ unit: "paragraphs" | "sentences" | "words"; count: string; startWithLorem: boolean }>({
  initial: () => ({ unit: "paragraphs", count: "3", startWithLorem: true }),
  generator: true,
  Inputs: ({ s, set }) => (
    <Row>
      <NumberInput label="How many (1–1,000)" value={s.count} onChange={(count) => set({ count })} className="w-28" />
      <SelectField
        label="Of"
        value={s.unit}
        options={[
          { value: "paragraphs", label: "Paragraphs" },
          { value: "sentences", label: "Sentences" },
          { value: "words", label: "Words" },
        ]}
        onChange={(unit) => set({ unit })}
      />
      <Check label='Start with "Lorem ipsum"' checked={s.startWithLorem} onChange={(startWithLorem) => set({ startWithLorem })} />
    </Row>
  ),
  compute: (s) => ({
    text: t.lorem({ unit: s.unit, count: Math.floor(Number(s.count)) || 1, startWithLorem: s.startWithLorem, seed: Math.floor(Math.random() * 2 ** 31) }),
    textLabel: "Placeholder text",
    download: { name: "lorem-ipsum.txt", type: "text/plain" },
  }),
});

const markdownEditor = tool<{ input: string }>({
  initial: () => ({ input: "# My document\n\nWrite **Markdown** here. The preview updates as you type.\n\n- Lists\n- [Links](https://example.com)\n- `code`\n" }),
  textKeys: ["input"],
  Inputs: ({ s, set }) => <TextArea label="Markdown" value={s.input} onChange={(input) => set({ input })} rows={16} mono />,
  compute: async (s) => {
    const r = await renderMarkdown(s.input);
    const title = s.input.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Document";
    const st = t.stats(s.input);
    return {
      note: `${n(st.words)} words · ${t.formatDuration(t.readingSeconds(st.words, 238))} to read`,
      node: <MarkdownPreview fragment={r.fragment} blocked={r.blockedImages} />,
      text: s.input,
      textLabel: "Markdown",
      download: { name: "document.md", type: "text/markdown" },
      extraDownloads: [{ name: "document.html", type: "text/html", text: htmlDocument(r.html, title) }],
    };
  },
});

export const textConfigs: Record<string, AnyFormTool> = {
  "word-counter": counter("words"),
  "character-counter": counter("characters"),
  "sentence-counter": counter("sentences"),
  "paragraph-counter": counter("paragraphs"),
  "text-case-converter": caseTool(),
  "uppercase-converter": caseTool("upper"),
  "lowercase-converter": caseTool("lower"),
  "title-case-converter": caseTool("title"),
  "remove-duplicate-lines": dedupe,
  "sort-text-lines": sorter,
  "reverse-text": reverser,
  "remove-extra-spaces": spaces,
  "remove-empty-lines": emptyLines,
  "find-and-replace": findReplace,
  "text-cleaner": cleaner,
  "text-diff-checker": diffTool,
  "reading-time-calculator": readingTime,
  "lorem-ipsum-generator": loremTool,
  "markdown-editor": markdownEditor,
};
