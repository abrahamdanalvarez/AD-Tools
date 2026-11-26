import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { formatBytes } from "@/lib/files";
import { CancelledError } from "@/lib/worker-bridge";
import type { CompressLevel } from "../core/compress";
import { PdfError } from "../core/errors";
import type { PageOrientation, PageSize } from "../core/images";
import type { PdfInfo, PdfMetadata } from "../core/meta";
import type { Angle } from "../core/organize";
import { parseRangeGroups } from "../core/ranges";
import type { FontName, NumberFormat, NumberPosition } from "../core/stamp";
import { readBytes, runPdf, type JobOptions } from "../run";
import { PagesField, RangeField, SelectField, TextField, tryPages } from "./fields";
import { PageOrder, PageThumb, usePdfDocument } from "./pages";
import { PlacementEditor, usePageWidth, type Point } from "./placement";
import type { Ctx, PdfToolConfig, SettingsProps, ToolResult } from "./shell";
import { SignatureInput, type SignatureImage } from "./signature";

// ── helpers ────────────────────────────────────────────────────────────────

const baseName = (f: File) => f.name.replace(/\.[^.]+$/, "") || "document";
const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });
const pagesIn = (ctx: Ctx) => ctx.first.info?.pageCount ?? 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function onePdf(ctx: Ctx, suffix: string, bytes: Uint8Array, summary?: string): Promise<ToolResult> {
  return { files: [{ name: `${baseName(ctx.first.file)}-${suffix}.pdf`, blob: pdfBlob(bytes) }], summary, preview: "pdf" };
}

function sizeSummary(before: number, after: number) {
  const change = Math.round((1 - after / before) * 100);
  return `${formatBytes(before)} → ${formatBytes(after)}${change > 0 ? ` (${change}% smaller)` : ""}`;
}

/** Simple ops: read the chosen PDF, run one worker op, return one PDF. */
async function simple(ctx: Ctx, job: JobOptions, suffix: string, build: (file: Uint8Array) => Parameters<typeof runPdf>[0]) {
  const file = await readBytes(ctx.first.file);
  const { outputs } = await runPdf(build(file), job);
  return onePdf(ctx, suffix, outputs[0].bytes);
}

interface Scope {
  scope: "all" | "custom";
  pages: string;
}

function ScopeFields<S extends Scope>({ s, set, ctx, label }: SettingsProps<S> & { label: string }) {
  return (
    <>
      <SelectField
        label={label}
        value={s.scope}
        onChange={(scope) => set({ scope } as Partial<S>)}
        options={[
          { value: "all", label: "All pages" },
          { value: "custom", label: "Only some pages" },
        ]}
      />
      {s.scope === "custom" && (
        <PagesField label="Pages" value={s.pages} onChange={(pages) => set({ pages } as Partial<S>)} file={ctx.first.file} pageCount={pagesIn(ctx)} />
      )}
    </>
  );
}

const scopeProblem = (s: Scope, ctx: Ctx) => (s.scope === "custom" && !tryPages(s.pages, pagesIn(ctx)) ? "Enter valid page numbers." : null);
const scopePages = (s: Scope, ctx: Ctx) => (s.scope === "custom" ? tryPages(s.pages, pagesIn(ctx))! : undefined);

function checkCancelled(job: JobOptions) {
  if (job.signal?.aborted) throw new CancelledError();
}

// ── organise ───────────────────────────────────────────────────────────────

const merge: PdfToolConfig<object> = {
  multiple: true,
  minFiles: 2,
  initial: () => ({}),
  action: (_, ctx) => `Merge ${ctx.files.length} PDFs`,
  working: "Merging…",
  async run(_, ctx, job) {
    const files = await Promise.all(ctx.files.map((f) => readBytes(f.file)));
    const { outputs } = await runPdf({ op: "merge", files }, job);
    return { files: [{ name: "merged.pdf", blob: pdfBlob(outputs[0].bytes) }], preview: "pdf" };
  },
};

interface SplitS {
  mode: "ranges" | "every" | "each";
  ranges: string;
  every: string;
}
const split: PdfToolConfig<SplitS> = {
  initial: (ctx) => ({ mode: "ranges", ranges: pagesIn(ctx) > 1 ? `1-${Math.ceil(pagesIn(ctx) / 2)}, ${Math.ceil(pagesIn(ctx) / 2) + 1}-` : "1", every: "1" }),
  Settings: ({ s, set }) => (
    <>
      <SelectField
        label="Split into"
        value={s.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "ranges", label: "Page ranges I choose" },
          { value: "every", label: "Files of a fixed number of pages" },
          { value: "each", label: "One file per page" },
        ]}
      />
      {s.mode === "ranges" && (
        <TextField label="Ranges" value={s.ranges} onChange={(ranges) => set({ ranges })} hint="Each comma-separated range becomes one file. For example 1-3, 4-6, 7-." />
      )}
      {s.mode === "every" && <TextField label="Pages per file" type="number" value={s.every} onChange={(every) => set({ every })} className="w-28" />}
    </>
  ),
  validate: (s, ctx) => {
    if (s.mode === "ranges") {
      try {
        parseRangeGroups(s.ranges, pagesIn(ctx));
      } catch {
        return "Enter valid page ranges.";
      }
    }
    if (s.mode === "every" && !(Number(s.every) >= 1)) return "Enter how many pages each file should have.";
    return null;
  },
  action: () => "Split PDF",
  working: "Splitting…",
  async run(s, ctx, job) {
    const count = pagesIn(ctx);
    const groups =
      s.mode === "ranges"
        ? parseRangeGroups(s.ranges, count)
        : Array.from({ length: Math.ceil(count / (s.mode === "each" ? 1 : Number(s.every))) }, (_, i) => {
            const size = s.mode === "each" ? 1 : Number(s.every);
            return Array.from({ length: Math.min(size, count - i * size) }, (_, k) => i * size + k);
          });
    const { outputs } = await runPdf({ op: "split", file: await readBytes(ctx.first.file), groups }, job);
    const base = baseName(ctx.first.file);
    const label = (g: number[]) => (g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`);
    return {
      files: outputs.map((o, i) => ({ name: `${base}-${label(groups[i])}.pdf`, blob: pdfBlob(o.bytes) })),
      zipName: `${base}-split.zip`,
      preview: "pdf",
    };
  },
};

interface PagesS {
  pages: string;
}
const pagesProblem = (s: PagesS, ctx: Ctx) => (tryPages(s.pages, pagesIn(ctx)) ? null : "Enter valid page numbers.");

const deletePages: PdfToolConfig<PagesS> = {
  initial: () => ({ pages: "" }),
  Settings: ({ s, set, ctx }) => (
    <PagesField label="Pages to delete" value={s.pages} onChange={(pages) => set({ pages })} file={ctx.first.file} pageCount={pagesIn(ctx)} />
  ),
  validate: (s, ctx) => {
    const p = tryPages(s.pages, pagesIn(ctx));
    if (!p) return "Choose the pages to delete.";
    return p.length >= pagesIn(ctx) ? "You can't delete every page. Keep at least one." : null;
  },
  action: (s, ctx) => `Delete ${plural(tryPages(s.pages, pagesIn(ctx))?.length ?? 0, "page")}`,
  working: "Deleting pages…",
  run: (s, ctx, job) => simple(ctx, job, "edited", (file) => ({ op: "delete", file, pages: tryPages(s.pages, pagesIn(ctx))! })),
};

const extractPages: PdfToolConfig<PagesS> = {
  initial: () => ({ pages: "" }),
  Settings: ({ s, set, ctx }) => (
    <PagesField
      label="Pages to extract"
      value={s.pages}
      onChange={(pages) => set({ pages })}
      file={ctx.first.file}
      pageCount={pagesIn(ctx)}
      hint="Pages are copied into a new PDF in the order you type them. For example 3, 1-2."
    />
  ),
  validate: (s, ctx) => (tryPages(s.pages, pagesIn(ctx)) ? null : "Choose the pages to extract."),
  action: (s, ctx) => `Extract ${plural(tryPages(s.pages, pagesIn(ctx))?.length ?? 0, "page")}`,
  working: "Extracting pages…",
  run: (s, ctx, job) => simple(ctx, job, "extract", (file) => ({ op: "extract", file, pages: tryPages(s.pages, pagesIn(ctx))! })),
};

interface DuplicateS extends PagesS {
  copies: string;
}
const duplicatePages: PdfToolConfig<DuplicateS> = {
  initial: () => ({ pages: "1", copies: "1" }),
  Settings: ({ s, set, ctx }) => (
    <>
      <PagesField label="Pages to duplicate" value={s.pages} onChange={(pages) => set({ pages })} file={ctx.first.file} pageCount={pagesIn(ctx)} />
      <TextField label="Copies of each page" type="number" value={s.copies} onChange={(copies) => set({ copies })} className="w-28" hint="1 to 20. Copies go right after the original page." />
    </>
  ),
  validate: (s, ctx) => pagesProblem(s, ctx) ?? (Number(s.copies) >= 1 && Number(s.copies) <= 20 ? null : "Choose 1 to 20 copies."),
  action: () => "Duplicate pages",
  working: "Duplicating pages…",
  run: (s, ctx, job) =>
    simple(ctx, job, "duplicated", (file) => ({ op: "duplicate", file, pages: tryPages(s.pages, pagesIn(ctx))!, copies: Number(s.copies) })),
};

interface RotateS extends Scope {
  angle: `${Angle}`;
}
const rotate: PdfToolConfig<RotateS> = {
  initial: () => ({ angle: "90", scope: "all", pages: "" }),
  Settings: (p) => (
    <>
      <SelectField
        label="Rotation"
        value={p.s.angle}
        onChange={(angle) => p.set({ angle })}
        options={[
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180° (upside down)" },
          { value: "270", label: "90° counter-clockwise" },
        ]}
      />
      <ScopeFields {...p} label="Rotate" />
    </>
  ),
  validate: scopeProblem,
  action: () => "Rotate PDF",
  working: "Rotating…",
  run: (s, ctx, job) =>
    simple(ctx, job, "rotated", (file) => ({ op: "rotate", file, angle: Number(s.angle) as Angle, pages: scopePages(s, ctx) })),
};

interface OrderS {
  order: number[];
  text: string;
}
const orderText = (o: number[]) => o.map((i) => i + 1).join(", ");
function parseOrder(text: string, count: number): number[] | null {
  const nums = text.split(/[,\s]+/).filter(Boolean).map(Number);
  if (nums.length !== count || nums.some((n) => !Number.isInteger(n) || n < 1 || n > count) || new Set(nums).size !== count) return null;
  return nums.map((n) => n - 1);
}
const reorder: PdfToolConfig<OrderS> = {
  initial: (ctx) => {
    const order = Array.from({ length: pagesIn(ctx) }, (_, i) => i);
    return { order, text: orderText(order) };
  },
  Settings: ({ s, set, ctx }) => (
    <>
      <TextField
        label="New page order"
        value={s.text}
        onChange={(text) => {
          const order = parseOrder(text, pagesIn(ctx));
          set(order ? { text, order } : { text });
        }}
        hint="List every page number once, for example 3, 1, 2. Or use the buttons below."
        className="sm:w-96"
      />
      {pagesIn(ctx) <= 300 && <PageOrder file={ctx.first.file} order={s.order} onChange={(order) => set({ order, text: orderText(order) })} />}
    </>
  ),
  validate: (s, ctx) => (parseOrder(s.text, pagesIn(ctx)) ? null : `List each page from 1 to ${pagesIn(ctx)} exactly once.`),
  action: () => "Save new order",
  working: "Reordering…",
  run: (s, ctx, job) => simple(ctx, job, "reordered", (file) => ({ op: "reorder", file, order: s.order })),
};

const reverse: PdfToolConfig<object> = {
  initial: () => ({}),
  action: () => "Reverse page order",
  working: "Reversing…",
  run: (_, ctx, job) => simple(ctx, job, "reversed", (file) => ({ op: "reverse", file })),
};

// ── convert ────────────────────────────────────────────────────────────────

interface ImagesS {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: "0" | "18" | "36";
}
const imagesToPdf: PdfToolConfig<ImagesS> = {
  input: "images",
  multiple: true,
  initial: () => ({ pageSize: "fit", orientation: "auto", margin: "0" }),
  Settings: ({ s, set }) => (
    <>
      <SelectField
        label="Page size"
        value={s.pageSize}
        onChange={(pageSize) => set({ pageSize })}
        options={[
          { value: "fit", label: "Same as each image" },
          { value: "a4", label: "A4" },
          { value: "letter", label: "US Letter" },
        ]}
      />
      {s.pageSize !== "fit" && (
        <SelectField
          label="Orientation"
          value={s.orientation}
          onChange={(orientation) => set({ orientation })}
          options={[
            { value: "auto", label: "Automatic (match each image)" },
            { value: "portrait", label: "Portrait" },
            { value: "landscape", label: "Landscape" },
          ]}
        />
      )}
      <SelectField
        label="Margin"
        value={s.margin}
        onChange={(margin) => set({ margin })}
        options={[
          { value: "0", label: "None" },
          { value: "18", label: "Small (0.25 in)" },
          { value: "36", label: "Large (0.5 in)" },
        ]}
      />
    </>
  ),
  action: (_, ctx) => `Create PDF from ${plural(ctx.files.length, "image")}`,
  working: "Creating PDF…",
  async run(s, ctx, job) {
    const { normalizeImage } = await import("../browser/images");
    const images = [];
    for (const f of ctx.files) {
      checkCancelled(job);
      try {
        images.push(await normalizeImage(f.file));
      } catch {
        throw new PdfError("image");
      }
    }
    const { outputs } = await runPdf(
      { op: "images", images, options: { pageSize: s.pageSize, orientation: s.orientation, margin: Number(s.margin) } },
      job,
    );
    const name = ctx.files.length === 1 ? `${baseName(ctx.first.file)}.pdf` : "images.pdf";
    return { files: [{ name, blob: pdfBlob(outputs[0].bytes) }], preview: "pdf" };
  },
};

interface RenderS extends Scope {
  dpi: "72" | "150" | "300";
  quality: number;
}
function pdfToImages(type: "image/jpeg" | "image/png"): PdfToolConfig<RenderS> {
  const ext = type === "image/jpeg" ? "jpg" : "png";
  return {
    initial: () => ({ dpi: "150", quality: 90, scope: "all", pages: "" }),
    Settings: (p) => (
      <>
        <SelectField
          label="Resolution"
          value={p.s.dpi}
          onChange={(dpi) => p.set({ dpi })}
          options={[
            { value: "72", label: "Screen (72 DPI, smallest)" },
            { value: "150", label: "Standard (150 DPI)" },
            { value: "300", label: "Print (300 DPI, largest)" },
          ]}
        />
        {type === "image/jpeg" && <RangeField label="Quality" value={p.s.quality} min={40} max={100} step={5} onChange={(quality) => p.set({ quality })} format={(v) => `${v}%`} />}
        <ScopeFields {...p} label="Convert" />
      </>
    ),
    validate: scopeProblem,
    action: () => `Convert to ${ext.toUpperCase()}`,
    working: "Rendering pages…",
    async run(s, ctx, job) {
      const { openDocument, renderPage, canvasToBlob } = await import("../browser/pdfjs");
      const doc = await openDocument(await readBytes(ctx.first.file));
      const pages = scopePages(s, ctx) ?? Array.from({ length: doc.numPages }, (_, i) => i);
      const base = baseName(ctx.first.file);
      const files = [];
      let reduced = false;
      try {
        for (let k = 0; k < pages.length; k++) {
          checkCancelled(job);
          const r = await renderPage(doc, pages[k] + 1, Number(s.dpi) / 72);
          reduced ||= r.reduced;
          const blob = await canvasToBlob(r.canvas, type, s.quality / 100);
          r.canvas.width = r.canvas.height = 0; // free the pixels now
          files.push({ name: `${base}-page-${pages[k] + 1}.${ext}`, blob });
          job.onProgress?.(Math.round(((k + 1) / pages.length) * 100));
        }
      } finally {
        void doc.loadingTask.destroy();
      }
      return {
        files,
        preview: "images",
        zipName: `${base}-${ext}.zip`,
        summary: reduced ? "Some large pages were rendered at a lower resolution to stay within your browser's limits." : undefined,
      };
    },
  };
}

// ── optimise ───────────────────────────────────────────────────────────────

const compress: PdfToolConfig<{ level: CompressLevel }> = {
  initial: () => ({ level: "balanced" }),
  Settings: ({ s, set }) => (
    <>
      <SelectField
        label="Compression"
        value={s.level}
        onChange={(level) => set({ level })}
        options={[
          { value: "light", label: "Light: best quality (photos at 85%, up to 3000 px)" },
          { value: "balanced", label: "Balanced (photos at 70%, up to 2000 px)" },
          { value: "strong", label: "Strong: smallest (photos at 50%, up to 1400 px)" },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Only photos stored as JPEG are re-compressed, so they may look slightly softer. Text, fonts, vector graphics and links are
        not changed and text stays selectable. Files without photos usually shrink only a little.
      </p>
    </>
  ),
  action: () => "Compress PDF",
  working: "Compressing…",
  async run(s, ctx, job) {
    const before = ctx.first.file.size;
    const r = await runPdf({ op: "compress", file: await readBytes(ctx.first.file), level: s.level }, job);
    const d = r.data as { imagesTotal: number; imagesRecompressed: number; unchanged: boolean };
    const out = r.outputs[0].bytes;
    const res = await onePdf(
      ctx,
      "compressed",
      out,
      d.unchanged
        ? "This PDF couldn't be made smaller, so the file is unchanged."
        : `${sizeSummary(before, out.length)} · ${d.imagesRecompressed} of ${plural(d.imagesTotal, "image")} re-compressed`,
    );
    if (d.unchanged) res.title = "Already compact";
    return res;
  },
};

const repair: PdfToolConfig<object> = {
  // Damaged files can't be inspected up front; the repair itself validates them.
  inspect: false,
  initial: () => ({}),
  action: () => "Repair PDF",
  working: "Rebuilding the file…",
  async run(_, ctx, job) {
    const r = await runPdf({ op: "repair", file: await readBytes(ctx.first.file) }, job);
    const pages = (r.data as { pageCount: number }).pageCount;
    return onePdf(ctx, "repaired", r.outputs[0].bytes, `Rebuilt with ${plural(pages, "page")} recovered`);
  },
};

const flatten: PdfToolConfig<object> = {
  initial: () => ({}),
  validate: (_, ctx) => (ctx.first.info?.formFields ? null : "This PDF has no form fields to flatten."),
  action: (_, ctx) => `Flatten ${plural(ctx.first.info?.formFields ?? 0, "form field")}`,
  working: "Flattening…",
  run: (_, ctx, job) => simple(ctx, job, "flattened", (file) => ({ op: "flatten", file })),
};

// ── edit ───────────────────────────────────────────────────────────────────

interface WatermarkS extends Scope {
  text: string;
  size: "0" | "36" | "60" | "96";
  opacity: number;
  angle: "45" | "0";
  color: string;
}
const watermark: PdfToolConfig<WatermarkS> = {
  initial: () => ({ text: "CONFIDENTIAL", size: "0", opacity: 25, angle: "45", color: "#6b7280", scope: "all", pages: "" }),
  Settings: (p) => (
    <>
      <TextField label="Watermark text" value={p.s.text} onChange={(text) => p.set({ text })} />
      <SelectField
        label="Size"
        value={p.s.size}
        onChange={(size) => p.set({ size })}
        options={[
          { value: "0", label: "Fit the page" },
          { value: "36", label: "Small" },
          { value: "60", label: "Medium" },
          { value: "96", label: "Large" },
        ]}
      />
      <SelectField
        label="Direction"
        value={p.s.angle}
        onChange={(angle) => p.set({ angle })}
        options={[
          { value: "45", label: "Diagonal" },
          { value: "0", label: "Horizontal" },
        ]}
      />
      <SelectField
        label="Colour"
        value={p.s.color}
        onChange={(color) => p.set({ color })}
        options={[
          { value: "#6b7280", label: "Grey" },
          { value: "#dc2626", label: "Red" },
          { value: "#2563eb", label: "Blue" },
          { value: "#000000", label: "Black" },
        ]}
      />
      <RangeField label="Opacity" value={p.s.opacity} min={10} max={100} step={5} onChange={(opacity) => p.set({ opacity })} format={(v) => `${v}%`} />
      <ScopeFields {...p} label="Add to" />
    </>
  ),
  validate: (s, ctx) => (s.text.trim() ? scopeProblem(s, ctx) : "Enter the watermark text."),
  action: () => "Add watermark",
  working: "Adding watermark…",
  run: (s, ctx, job) =>
    simple(ctx, job, "watermarked", (file) => ({
      op: "watermark",
      file,
      options: { text: s.text, size: Number(s.size), opacity: s.opacity / 100, angle: Number(s.angle), color: s.color, pages: scopePages(s, ctx) },
    })),
};

interface NumbersS extends Scope {
  position: NumberPosition;
  format: NumberFormat;
  start: string;
  size: "8" | "10" | "12" | "14";
}
const pageNumbers: PdfToolConfig<NumbersS> = {
  initial: () => ({ position: "bottom-center", format: "n", start: "1", size: "10", scope: "all", pages: "" }),
  Settings: (p) => (
    <>
      <SelectField
        label="Position"
        value={p.s.position}
        onChange={(position) => p.set({ position })}
        options={[
          { value: "bottom-center", label: "Bottom centre" },
          { value: "bottom-right", label: "Bottom right" },
          { value: "bottom-left", label: "Bottom left" },
          { value: "top-center", label: "Top centre" },
          { value: "top-right", label: "Top right" },
          { value: "top-left", label: "Top left" },
        ]}
      />
      <SelectField
        label="Format"
        value={p.s.format}
        onChange={(format) => p.set({ format })}
        options={[
          { value: "n", label: "1" },
          { value: "page-n", label: "Page 1" },
          { value: "n-of-total", label: "1 / 10" },
          { value: "page-n-of-total", label: "Page 1 of 10" },
        ]}
      />
      <TextField label="Start at" type="number" value={p.s.start} onChange={(start) => p.set({ start })} className="w-28" />
      <SelectField
        label="Text size"
        value={p.s.size}
        onChange={(size) => p.set({ size })}
        options={[
          { value: "8", label: "Small (8 pt)" },
          { value: "10", label: "Normal (10 pt)" },
          { value: "12", label: "Large (12 pt)" },
          { value: "14", label: "Extra large (14 pt)" },
        ]}
      />
      <ScopeFields {...p} label="Number" />
    </>
  ),
  validate: (s, ctx) => (Number.isInteger(Number(s.start)) && Number(s.start) >= 0 ? scopeProblem(s, ctx) : "Enter the first page number."),
  action: () => "Add page numbers",
  working: "Numbering pages…",
  run: (s, ctx, job) =>
    simple(ctx, job, "numbered", (file) => ({
      op: "numbers",
      file,
      options: { position: s.position, format: s.format, start: Number(s.start), size: Number(s.size), margin: 24, pages: scopePages(s, ctx) },
    })),
};

const cssFont: Record<FontName, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  "helvetica-bold": "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};

function PageNumberField({ value, onChange, ctx }: { value: string; onChange: (v: string) => void; ctx: Ctx }) {
  return <TextField label={`Page (1 to ${pagesIn(ctx)})`} type="number" value={value} onChange={onChange} className="w-28" />;
}
const pageIndex = (v: string, ctx: Ctx) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= pagesIn(ctx) ? n - 1 : null;
};

interface TextS {
  page: string;
  text: string;
  size: string;
  font: FontName;
  color: string;
  at: Point;
}
function TextSettings({ s, set, ctx }: SettingsProps<TextS>) {
  const page = pageIndex(s.page, ctx) ?? 0;
  const dims = usePageWidth(ctx.first.file, page);
  const lines = s.text.split("\n");
  const size = Number(s.size) || 12;
  const boxW = dims ? Math.min(1, (Math.max(...lines.map((l) => l.length), 1) * size * 0.56) / dims.width) : 0.3;
  const boxH = dims ? Math.min(1, (lines.length * size * 1.2) / dims.height) : 0.05;
  return (
    <>
      <TextField label="Text" value={s.text} onChange={(text) => set({ text })} multiline />
      <PageNumberField value={s.page} onChange={(p) => set({ page: p })} ctx={ctx} />
      <SelectField
        label="Font"
        value={s.font}
        onChange={(font) => set({ font })}
        options={[
          { value: "helvetica", label: "Sans serif (Helvetica)" },
          { value: "helvetica-bold", label: "Sans serif bold" },
          { value: "times", label: "Serif (Times)" },
          { value: "courier", label: "Monospace (Courier)" },
        ]}
      />
      <TextField label="Size (pt)" type="number" value={s.size} onChange={(v) => set({ size: v })} className="w-28" />
      <SelectField
        label="Colour"
        value={s.color}
        onChange={(color) => set({ color })}
        options={[
          { value: "#000000", label: "Black" },
          { value: "#1d4ed8", label: "Blue" },
          { value: "#dc2626", label: "Red" },
          { value: "#6b7280", label: "Grey" },
        ]}
      />
      <PlacementEditor file={ctx.first.file} page={page} value={s.at} onChange={(at) => set({ at })} boxWidth={boxW} boxHeight={boxH} label="Text position">
        {(scale) => (
          <span
            className="block leading-[1.2] whitespace-pre"
            style={{ fontSize: size * scale, fontFamily: cssFont[s.font], fontWeight: s.font === "helvetica-bold" ? 700 : 400, color: s.color }}
          >
            {s.text}
          </span>
        )}
      </PlacementEditor>
    </>
  );
}
const addText: PdfToolConfig<TextS> = {
  initial: () => ({ page: "1", text: "", size: "14", font: "helvetica", color: "#000000", at: { x: 0.1, y: 0.1 } }),
  Settings: TextSettings,
  validate: (s, ctx) =>
    !s.text.trim() ? "Enter the text to add." : pageIndex(s.page, ctx) === null ? "Choose a page that exists." : Number(s.size) >= 4 && Number(s.size) <= 200 ? null : "Use a size from 4 to 200 pt.",
  action: () => "Add text",
  working: "Adding text…",
  run: (s, ctx, job) =>
    simple(ctx, job, "edited", (file) => ({
      op: "text",
      file,
      options: { page: pageIndex(s.page, ctx)!, x: s.at.x, y: s.at.y, text: s.text, size: Number(s.size), font: s.font, color: s.color },
    })),
};

interface ImageS {
  page: string;
  width: number;
  at: Point;
  image: (SignatureImage & { kind: "png" | "jpg" }) | null;
}
function ImagePlacement({ s, set, ctx, label }: SettingsProps<ImageS> & { label: string }) {
  const page = pageIndex(s.page, ctx) ?? 0;
  const dims = usePageWidth(ctx.first.file, page);
  const w = s.width / 100;
  const h = s.image && dims ? Math.min(1, (w * dims.width) / s.image.aspect / dims.height) : 0.1;
  return (
    <>
      <PageNumberField value={s.page} onChange={(p) => set({ page: p })} ctx={ctx} />
      <RangeField label="Width" value={s.width} min={5} max={100} onChange={(width) => set({ width })} format={(v) => `${v}% of the page`} />
      {s.image && (
        <PlacementEditor file={ctx.first.file} page={page} value={s.at} onChange={(at) => set({ at })} boxWidth={w} boxHeight={h} label={label}>
          {() => <img src={s.image!.url} alt="" className="size-full object-fill" />}
        </PlacementEditor>
      )}
    </>
  );
}
/** Revoke a preview URL when the image changes or the tool closes. */
function useRevoke(url: string | undefined) {
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
}

function AddImageSettings(p: SettingsProps<ImageS>) {
  const [error, setError] = useState(false);
  useRevoke(p.s.image?.url);
  return (
    <>
      <div className="grid gap-2">
        <label htmlFor="pdf-add-image" className="text-sm font-medium">
          Image (PNG or JPG)
        </label>
        <input
          id="pdf-add-image"
          type="file"
          accept=".png,.jpg,.jpeg"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setError(false);
            if (!f) return;
            try {
              const bytes = new Uint8Array(await f.arrayBuffer());
              const kind = bytes[0] === 0x89 ? "png" : "jpg";
              const bmp = await createImageBitmap(f);
              const aspect = bmp.width / bmp.height;
              bmp.close();
              p.set({ image: { png: bytes, kind, aspect, url: URL.createObjectURL(f) } });
            } catch {
              setError(true);
              p.set({ image: null });
            }
          }}
        />
        {error && <p className="text-sm text-error-text">That image could not be read.</p>}
      </div>
      <ImagePlacement {...p} label="Image position" />
    </>
  );
}
const imageValidate = (s: ImageS, ctx: Ctx) => (!s.image ? "Choose an image." : pageIndex(s.page, ctx) === null ? "Choose a page that exists." : null);
const runImage = (suffix: string) => (s: ImageS, ctx: Ctx, job: JobOptions) =>
  simple(ctx, job, suffix, (file) => ({
    op: "image",
    file,
    // A copy: the worker takes ownership of what it's given.
    options: { page: pageIndex(s.page, ctx)!, x: s.at.x, y: s.at.y, width: s.width / 100, image: s.image!.png.slice(), kind: s.image!.kind },
  }));

const addImage: PdfToolConfig<ImageS> = {
  initial: () => ({ page: "1", width: 30, at: { x: 0.1, y: 0.1 }, image: null }),
  Settings: AddImageSettings,
  validate: imageValidate,
  action: () => "Add image",
  working: "Adding image…",
  run: runImage("edited"),
};

function SignSettings(p: SettingsProps<ImageS>) {
  useRevoke(p.s.image?.url);
  return (
    <>
      <Alert tone="info" title="This is a visual signature">
        It places an image of your signature on the page, like signing a printout. It is not a cryptographic digital signature:
        it does not prove who signed or show whether the file was changed later.
      </Alert>
      <SignatureInput onChange={(sig) => p.set({ image: sig ? { ...sig, kind: "png" } : null })} />
      <ImagePlacement {...p} label="Signature position" />
    </>
  );
}
const sign: PdfToolConfig<ImageS> = {
  initial: (ctx) => ({ page: `${pagesIn(ctx)}`, width: 25, at: { x: 0.6, y: 0.8 }, image: null }),
  Settings: SignSettings,
  validate: (s, ctx) => (!s.image ? "Draw, type or choose your signature." : imageValidate(s, ctx)),
  action: () => "Sign PDF",
  working: "Adding signature…",
  run: runImage("signed"),
};

const metaFields: { key: keyof PdfMetadata; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords (comma separated)" },
  { key: "creator", label: "Creator (app that made the original)" },
  { key: "producer", label: "Producer (app that made the PDF)" },
];
const emptyMeta: PdfMetadata = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "" };

const metadataEditor: PdfToolConfig<PdfMetadata> = {
  initial: (ctx) => ({ ...emptyMeta, ...(ctx.first.info?.metadata ?? {}), keywords: (ctx.first.info?.metadata?.keywords ?? "").split(/\s+/).filter(Boolean).join(", ") }),
  Settings: ({ s, set }) => (
    <>
      {metaFields.map((f) => (
        <TextField key={f.key} label={f.label} value={s[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<PdfMetadata>)} className="sm:w-96" />
      ))}
    </>
  ),
  action: () => "Save metadata",
  working: "Saving…",
  run: (s, ctx, job) => simple(ctx, job, "metadata", (file) => ({ op: "set-meta", file, meta: s })),
};

const metadataRemover: PdfToolConfig<object> = {
  initial: () => ({}),
  Settings: ({ ctx }) => (
    <>
      <MetadataTable info={ctx.first.info} />
      <p className="text-sm text-muted-foreground">
        Removes the title, author, subject, keywords, software names, dates and XMP metadata. Page content, comments,
        attachments and hidden layers are not changed.
      </p>
    </>
  ),
  action: () => "Remove metadata",
  working: "Removing metadata…",
  run: (_, ctx, job) => simple(ctx, job, "clean", (file) => ({ op: "strip-meta", file })),
};

// ── read and inspect ───────────────────────────────────────────────────────

const extractText: PdfToolConfig<{ separators: "yes" | "no" }> = {
  initial: () => ({ separators: "yes" }),
  Settings: ({ s, set }) => (
    <SelectField
      label="Page markers"
      value={s.separators}
      onChange={(separators) => set({ separators })}
      options={[
        { value: "yes", label: "Mark where each page starts" },
        { value: "no", label: "Just the text" },
      ]}
    />
  ),
  action: () => "Extract text",
  working: "Reading text…",
  async run(s, ctx, job) {
    const { openDocument, extractText: read } = await import("../browser/pdfjs");
    const doc = await openDocument(await readBytes(ctx.first.file));
    let pages: string[];
    try {
      pages = await read(doc, (n) => job.onProgress?.(Math.round((n / doc.numPages) * 100)), job.signal);
    } finally {
      void doc.loadingTask.destroy();
    }
    checkCancelled(job);
    if (pages.every((p) => !p)) throw new PdfError("no-text");
    const text = s.separators === "yes" ? pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join("\n\n") : pages.join("\n\n");
    return {
      files: [{ name: `${baseName(ctx.first.file)}.txt`, blob: new Blob([text], { type: "text/plain;charset=utf-8" }) }],
      preview: "text",
      text,
      summary: `${plural(text.length, "character")} from ${plural(pages.length, "page")}`,
    };
  },
};

const extractImages: PdfToolConfig<object> = {
  initial: () => ({}),
  action: () => "Extract images",
  working: "Finding images…",
  async run(_, ctx, job) {
    const r = await runPdf({ op: "extract-images", file: await readBytes(ctx.first.file) }, job);
    const skipped = (r.data as { skipped: number }).skipped;
    const type = (n: string) => (n.endsWith(".png") ? "image/png" : n.endsWith(".jpg") ? "image/jpeg" : "image/jp2");
    return {
      files: r.outputs.map((o) => ({ name: o.name!, blob: new Blob([o.bytes as BlobPart], { type: type(o.name!) }) })),
      preview: "images",
      zipName: `${baseName(ctx.first.file)}-images.zip`,
      summary: skipped ? `${plural(skipped, "image")} stored in an unusual format could not be exported.` : undefined,
    };
  },
};

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium">{k}</dt>
          <dd className="break-words text-muted-foreground">{v || "None"}</dd>
        </div>
      ))}
    </dl>
  );
}

const dateText = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "");
const yesNo = (b: boolean) => (b ? "Yes" : "No");

function MetadataTable({ info }: { info: PdfInfo | null }) {
  const m = info?.metadata ?? emptyMeta;
  return (
    <InfoTable
      rows={[
        ...metaFields.map((f) => [f.label.replace(/ \(.*\)$/, ""), m[f.key]] as [string, string]),
        ["Created", dateText(info?.created ?? null)],
        ["Modified", dateText(info?.modified ?? null)],
        ["XMP metadata", yesNo(!!info?.hasXmp)],
      ]}
    />
  );
}

const viewer = (title: string, view: (ctx: Ctx) => ToolResult["view"]): PdfToolConfig<object> => ({
  allowEncrypted: true,
  auto: true,
  initial: () => ({}),
  action: () => title,
  working: "Reading…",
  run: async (_, ctx) => ({ files: [], view: view(ctx) }),
});

const pdfInfo = viewer("Show information", (ctx) => {
  const i = ctx.first.info!;
  const size = i.firstPage ? `${i.firstPage.width} × ${i.firstPage.height} pt (${(i.firstPage.width / 72).toFixed(2)} × ${(i.firstPage.height / 72).toFixed(2)} in)` : "";
  return (
    <>
      <h2 className="text-lg font-semibold">Document information</h2>
      <InfoTable
        rows={[
          ["File size", formatBytes(ctx.first.file.size)],
          ["Pages", i.pageCount == null ? "Unknown (password protected)" : `${i.pageCount}`],
          ["PDF version", i.version],
          ["Password protected", yesNo(i.encrypted)],
          ["Page size", i.encrypted ? "" : `${size}${i.sameSizePages ? "" : " (first page; other pages differ)"}`],
          ["Form fields", i.encrypted ? "" : `${i.formFields}`],
          ["Bookmarks", yesNo(i.hasBookmarks)],
          ["Attachments", yesNo(i.hasAttachments)],
          ["JavaScript", i.hasJavaScript ? "Yes (never run by Privora)" : "No"],
          ["Title", i.metadata?.title ?? ""],
          ["Author", i.metadata?.author ?? ""],
          ["Producer", i.metadata?.producer ?? ""],
          ["Created", dateText(i.created)],
        ]}
      />
    </>
  );
});

const metadataViewer = viewer("Show metadata", (ctx) =>
  ctx.first.info?.encrypted ? (
    <Alert tone="warning" title="This PDF is password protected">
      Its metadata is encrypted. Unlock it first to see it.
    </Alert>
  ) : (
    <>
      <h2 className="text-lg font-semibold">Metadata</h2>
      <MetadataTable info={ctx.first.info} />
    </>
  ),
);

const pageCounter: PdfToolConfig<object> = {
  multiple: true,
  allowEncrypted: true,
  initial: () => ({}),
  action: (_, ctx) => `Count pages in ${plural(ctx.files.length, "file")}`,
  working: "Counting…",
  run: async (_, ctx) => {
    const known = ctx.files.filter((f) => f.info?.pageCount != null);
    const total = known.reduce((n, f) => n + (f.info!.pageCount ?? 0), 0);
    return {
      files: [],
      view: (
        <>
          <h2 className="text-lg font-semibold">
            {plural(total, "page")} in {plural(ctx.files.length, "file")}
          </h2>
          <InfoTable rows={ctx.files.map((f) => [f.file.name, f.info?.pageCount == null ? "Unknown (password protected)" : plural(f.info.pageCount, "page")])} />
        </>
      ),
    };
  },
};

function FullPreview({ file }: { file: Blob }) {
  const { doc, failed } = usePdfDocument(file);
  if (failed) return <Alert tone="error" title="This PDF could not be displayed." />;
  if (!doc) return <p className="text-sm text-muted-foreground">Loading pages…</p>;
  return (
    <>
      <h2 className="text-lg font-semibold">{plural(doc.numPages, "page")}</h2>
      <ol className="grid justify-items-center gap-6">
        {Array.from({ length: doc.numPages }, (_, i) => (
          <li key={i} className="grid w-full max-w-2xl justify-items-center gap-1 text-xs text-muted-foreground">
            <PageThumb doc={doc} page={i + 1} width={672} label={`Page ${i + 1}`} />
            Page {i + 1}
          </li>
        ))}
      </ol>
    </>
  );
}
const preview: PdfToolConfig<object> = {
  auto: true,
  initial: () => ({}),
  action: () => "Preview",
  working: "Opening…",
  run: async (_, ctx) => ({ files: [], view: <FullPreview file={ctx.first.file} /> }),
};

// ── passwords ──────────────────────────────────────────────────────────────

interface ProtectS {
  password: string;
  confirm: string;
}
const protect: PdfToolConfig<ProtectS> = {
  initial: () => ({ password: "", confirm: "" }),
  Settings: ({ s, set }) => (
    <>
      <TextField label="Password" type="password" value={s.password} onChange={(password) => set({ password })} autoComplete="new-password" />
      <TextField label="Confirm password" type="password" value={s.confirm} onChange={(confirm) => set({ confirm })} autoComplete="new-password" />
      <p className="text-sm text-muted-foreground">
        Encrypted with AES-256. Anyone who has the password can open and change the file. If you forget it, the file can't be
        recovered. The password is used only on this device and is never stored.
      </p>
    </>
  ),
  validate: (s) => (!s.password ? "Enter a password." : s.password !== s.confirm ? "The passwords don't match." : null),
  action: () => "Protect PDF",
  working: "Encrypting…",
  run: (s, ctx, job) => simple(ctx, job, "protected", (file) => ({ op: "protect", file, password: s.password })),
};

const unlock: PdfToolConfig<{ password: string }> = {
  allowEncrypted: true,
  initial: () => ({ password: "" }),
  Settings: ({ s, set }) => (
    <>
      <TextField label="PDF password" type="password" value={s.password} onChange={(password) => set({ password })} autoComplete="current-password" />
      <p className="text-sm text-muted-foreground">
        Enter the password you were given for this file. It is used only on this device and is never stored. Privora can't
        unlock files without their password.
      </p>
    </>
  ),
  validate: (s, ctx) => (!ctx.first.info?.encrypted ? "This PDF isn't password protected." : !s.password ? "Enter the password." : null),
  action: () => "Unlock PDF",
  working: "Decrypting…",
  run: (s, ctx, job) => simple(ctx, job, "unlocked", (file) => ({ op: "unlock", file, password: s.password })),
};

// ── registry of configs (tool ID → config) ─────────────────────────────────

export const pdfConfigs: Record<string, PdfToolConfig<any>> = {
  "merge-pdf": merge,
  "split-pdf": split,
  "compress-pdf": compress,
  "rotate-pdf": rotate,
  "reorder-pdf-pages": reorder,
  "delete-pdf-pages": deletePages,
  "extract-pdf-pages": extractPages,
  "pdf-to-jpg": pdfToImages("image/jpeg"),
  "pdf-to-png": pdfToImages("image/png"),
  "jpg-to-pdf": imagesToPdf,
  "png-to-pdf": imagesToPdf,
  "image-to-pdf": imagesToPdf,
  "duplicate-pdf-pages": duplicatePages,
  "reverse-pdf-pages": reverse,
  "add-watermark-to-pdf": watermark,
  "add-page-numbers-to-pdf": pageNumbers,
  "add-text-to-pdf": addText,
  "add-image-to-pdf": addImage,
  "sign-pdf": sign,
  "flatten-pdf": flatten,
  "pdf-metadata-editor": metadataEditor,
  "remove-pdf-metadata": metadataRemover,
  "extract-pdf-text": extractText,
  "extract-pdf-images": extractImages,
  "pdf-page-counter": pageCounter,
  "pdf-preview": preview,
  "pdf-info": pdfInfo,
  "pdf-metadata-viewer": metadataViewer,
  "protect-pdf": protect,
  "unlock-pdf": unlock,
  "repair-pdf": repair,
};
