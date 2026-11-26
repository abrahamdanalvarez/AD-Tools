import { useId } from "react";
import { Alert } from "@/components/ui/feedback";
import { formatBytes } from "@/lib/files";
import { CancelledError } from "@/lib/worker-bridge";
import type { JobOptions } from "@/tools/pdf/run";
import { Field, RangeField, SelectField, TextField } from "@/tools/pdf/ui/fields";
import type { Ctx, PdfToolConfig, PickedFile, ResultFile, SettingsProps, ToolResult } from "@/tools/pdf/ui/shell";
import { ImageError, imageErrorMessages } from "../core/errors";
import { mimeOf } from "../core/formats";
import { encodeIco } from "../core/ico";
import { stripMetadata } from "../core/metadata";
import { noAdjust, palette, type Adjust } from "../core/pixels";
import { fitsLimits, resizedSize, type Resize, type ResizeMode } from "../core/size";
import { decodeImage, inspectImage, type ImageInfo } from "../decode";
import { context, makeCanvas, toBlob, type OutputType, type Position, type Recipe } from "../render";
import { runImage } from "../run";
import { Compare } from "./compare";
import { centredRect, CropEditor, type Rect } from "./crop";
import { ColourPicker, CopyButton } from "./picker";
import { Base64View, Facts, infoRows, MetadataView, PaletteView, readMetadata } from "./views";

type Config<S> = PdfToolConfig<S>;

// ── helpers ────────────────────────────────────────────────────────────────

const OUT: Record<OutputType, { ext: string; label: string; lossy: boolean }> = {
  "image/png": { ext: "png", label: "PNG", lossy: false },
  "image/jpeg": { ext: "jpg", label: "JPG", lossy: true },
  "image/webp": { ext: "webp", label: "WebP", lossy: true },
};

const encodable = new Map<OutputType, boolean>();
/** Runtime check, not browser sniffing: Safari, for example, can't write WebP. */
export function canEncode(type: OutputType): boolean {
  if (type !== "image/webp") return true;
  if (!encodable.has(type)) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    encodable.set(type, c.toDataURL(type).startsWith(`data:${type}`));
  }
  return encodable.get(type)!;
}
const outputs = () => (Object.keys(OUT) as OutputType[]).filter(canEncode);

const baseName = (f: File) => f.name.replace(/\.[^.]+$/, "") || "image";
const img = (p: PickedFile) => p.image!;
/** Keep JPG and WebP as they are; everything else becomes PNG (lossless, keeps transparency). */
const sameType = (i: ImageInfo): OutputType => (i.format === "jpeg" ? "image/jpeg" : i.format === "webp" && canEncode("image/webp") ? "image/webp" : "image/png");

const withImages = <S,>(c: Config<NoInfer<S>>): Config<S> => ({
  input: "images",
  errors: imageErrorMessages,
  inspectFile: async (file) => ({ info: null, image: await inspectImage(file) }),
  ...c,
});

function sizeChange(before: number, after: number) {
  const pct = Math.round((1 - after / before) * 100);
  return `${formatBytes(before)} → ${formatBytes(after)}${pct > 0 ? ` (${pct}% smaller)` : pct < 0 ? ` (${-pct}% larger)` : ""}`;
}

/** Unique names inside a ZIP: photo.jpg, photo-2.jpg… */
function uniqueName(name: string, taken: Set<string>) {
  let n = name, i = 2;
  while (taken.has(n)) n = name.replace(/(\.[^.]+)$/, `-${i++}$1`);
  taken.add(n);
  return n;
}

interface Job {
  recipe: Recipe;
  suffix?: string;
  svgScale?: number;
  /** Return the original file when the output isn't smaller (compression). */
  keepSmaller?: boolean;
}

/** Process each chosen image in turn (one at a time keeps memory use low). */
async function processAll(ctx: Ctx, job: JobOptions, make: (p: PickedFile) => Job): Promise<ToolResult> {
  const n = ctx.files.length;
  const files: ResultFile[] = [];
  const taken = new Set<string>();
  let before = 0, after = 0, kept = 0;
  let last: { width: number; height: number } = { width: 0, height: 0 };
  for (const [i, p] of ctx.files.entries()) {
    if (job.signal?.aborted) throw new CancelledError();
    const j = make(p);
    const r = await runImage(p.file, j.recipe, { signal: job.signal, onProgress: (v) => job.onProgress?.((i * 100 + v) / n) }, j.svgScale);
    const keep = j.keepSmaller && r.blob.size >= p.file.size;
    const ext = keep ? p.file.name.slice(p.file.name.lastIndexOf(".") + 1) : OUT[j.recipe.type].ext;
    files.push({ name: uniqueName(`${baseName(p.file)}${j.suffix && !keep ? `-${j.suffix}` : ""}.${ext}`, taken), blob: keep ? p.file : r.blob });
    before += p.file.size;
    after += keep ? p.file.size : r.blob.size;
    if (keep) kept++;
    last = keep ? img(p) : r;
  }
  if (n === 1) {
    const f = files[0];
    return {
      title: kept ? "Your image is already well compressed" : "Your image is ready",
      files,
      summary: kept
        ? "This image couldn't be made smaller at these settings, so your original is kept. Try a lower quality or a smaller size."
        : `${f.name} · ${last.width} × ${last.height} · ${sizeChange(before, after)}`,
      node: <Compare before={ctx.first.file} after={f.blob} />,
    };
  }
  return {
    title: `${n} images are ready`,
    files,
    preview: "images",
    zipName: "privora-images.zip",
    summary: `${sizeChange(before, after)}${kept ? ` · ${kept} already small enough, kept as they were` : ""}`,
  };
}

function Notes({ ctx, type }: { ctx: Ctx; type?: OutputType }) {
  const animated = ctx.files.some((f) => f.image?.animated);
  const alpha = type === "image/jpeg" && ctx.files.some((f) => f.image?.alpha);
  return (
    <>
      {animated && (
        <Alert tone="warning" title="Animated image">
          Only the first frame is kept. The result is a still image.
        </Alert>
      )}
      {alpha && (
        <Alert tone="warning" title="Transparency will be lost">
          JPG can't store transparent areas, so they'll be filled with white. Choose PNG or WebP to keep them.
        </Alert>
      )}
    </>
  );
}

function Quality({ s, set }: { s: { quality: number }; set: (p: { quality: number }) => void }) {
  return <RangeField label="Quality" value={s.quality} min={10} max={100} step={5} onChange={(quality) => set({ quality })} format={(v) => `${v}%`} />;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field label={label} id={id}>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-20 cursor-pointer rounded-md border border-input bg-background p-1" />
    </Field>
  );
}

const anySvg = (ctx: Ctx) => ctx.files.some((f) => f.image?.format === "svg");
const webpProblem = (t: OutputType) => (canEncode(t) ? null : "Your browser can't create WebP files. Try Chrome, Edge or Firefox, or choose another format.");

// ── convert ────────────────────────────────────────────────────────────────

interface ConvertS {
  type: OutputType;
  quality: number;
  svgScale: number;
}

function convertSettings({ s, set, ctx }: SettingsProps<ConvertS>) {
  return (
    <>
      <SelectField label="Convert to" value={s.type} onChange={(type) => set({ type })} options={outputs().map((t) => ({ value: t, label: OUT[t].label }))} hint={canEncode("image/webp") ? undefined : "Your browser can't create WebP files."} />
      {OUT[s.type].lossy && <Quality s={s} set={set} />}
      {anySvg(ctx) && (
        <SelectField
          label="SVG size"
          value={String(s.svgScale)}
          onChange={(v) => set({ svgScale: Number(v) })}
          options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 1 ? "Original size" : `${n}× larger` }))}
          hint="SVG is a vector format, so it can be drawn larger without losing sharpness."
        />
      )}
      <Notes ctx={ctx} type={s.type} />
    </>
  );
}

const converter = (multiple: boolean): Config<ConvertS> =>
  withImages({
    multiple,
    initial: (ctx) => {
      const input = sameType(img(ctx.first));
      return { type: outputs().find((t) => t !== input) ?? "image/png", quality: 90, svgScale: 1 };
    },
    Settings: convertSettings,
    validate: (s) => webpProblem(s.type),
    action: (s, ctx) => (ctx.files.length > 1 ? `Convert ${ctx.files.length} images to ${OUT[s.type].label}` : `Convert to ${OUT[s.type].label}`),
    working: "Converting…",
    run: (s, ctx, job) => processAll(ctx, job, () => ({ recipe: { type: s.type, quality: s.quality / 100 }, svgScale: s.svgScale })),
  });

/** Fixed pairs such as JPG to PNG. */
const pair = (to: OutputType): Config<{ quality: number }> =>
  withImages({
    initial: () => ({ quality: 90 }),
    Settings: ({ s, set, ctx }) => (
      <>
        {OUT[to].lossy && <Quality s={s} set={set} />}
        <Notes ctx={ctx} type={to} />
      </>
    ),
    validate: () => webpProblem(to),
    action: () => `Convert to ${OUT[to].label}`,
    working: "Converting…",
    run: (s, ctx, job) => processAll(ctx, job, () => ({ recipe: { type: to, quality: s.quality / 100 } })),
  });

// ── optimise ───────────────────────────────────────────────────────────────

interface CompressS {
  quality: number;
  maxSide: number;
  format: "same" | OutputType;
}

const compressType = (s: CompressS, i: ImageInfo): OutputType => (s.format === "same" ? sameType(i) : s.format);

const compressor = (multiple: boolean): Config<CompressS> =>
  withImages({
    multiple,
    initial: () => ({ quality: 75, maxSide: 0, format: "same" }),
    Settings: ({ s, set, ctx }) => {
      const types = ctx.files.map((f) => compressType(s, img(f)));
      const lossless = types.every((t) => t === "image/png");
      return (
        <>
          <SelectField
            label="Format"
            value={s.format}
            onChange={(format) => set({ format })}
            options={[
              { value: "same", label: "Keep the format (PNG and GIF become PNG)" },
              ...outputs().filter((t) => OUT[t].lossy).map((t) => ({ value: t, label: `${OUT[t].label} (usually much smaller)` })),
            ]}
          />
          {lossless ? (
            <p className="text-sm text-muted-foreground">
              PNG is lossless: the image is re-saved with the most efficient settings, with no change to its pixels. For a much smaller file,
              choose JPG or WebP, or reduce the size.
            </p>
          ) : (
            <Quality s={s} set={set} />
          )}
          <SelectField
            label="Maximum size"
            value={String(s.maxSide)}
            onChange={(v) => set({ maxSide: Number(v) })}
            options={[
              { value: "0", label: "Keep the original size" },
              ...[3840, 2560, 1920, 1280, 800].map((n) => ({ value: String(n), label: `${n} pixels on the longest side` })),
            ]}
          />
          <Notes ctx={ctx} type={types.includes("image/jpeg") ? "image/jpeg" : undefined} />
        </>
      );
    },
    validate: (s) => (s.format === "same" ? null : webpProblem(s.format)),
    action: (_, ctx) => (ctx.files.length > 1 ? `Compress ${ctx.files.length} images` : "Compress image"),
    working: "Compressing…",
    run: (s, ctx, job) =>
      processAll(ctx, job, (p) => {
        const i = img(p);
        const big = s.maxSide && Math.max(i.width, i.height) > s.maxSide;
        const type = compressType(s, i);
        return {
          recipe: {
            type,
            quality: s.quality / 100,
            optimizePng: true,
            resize: big ? resizedSize(i, { mode: "fit", width: s.maxSide, height: s.maxSide, percent: 100 }) : undefined,
          },
          suffix: "compressed",
          // Same format and size: never hand back a bigger file.
          keepSmaller: !big && type === sameType(i) && i.format !== "svg" && i.format !== "gif" && i.format !== "bmp",
        };
      }),
  });

interface ResizeS extends Resize {
  keepRatio: boolean;
}

const resizeOf = (s: ResizeS): Resize => ({ ...s, mode: s.mode === "exact" && s.keepRatio ? "fit" : s.mode });

const resizer = (multiple: boolean): Config<ResizeS> =>
  withImages({
    multiple,
    initial: (ctx) => ({ mode: multiple ? "percent" : "exact", width: img(ctx.first).width, height: img(ctx.first).height, percent: 50, keepRatio: true }),
    Settings: ({ s, set, ctx }) => {
      const i = img(ctx.first);
      const out = resizedSize(i, resizeOf(s));
      // With "keep proportions", typing one side updates the other.
      const side = (k: "width" | "height") => (v: string) => {
        const n = Math.max(0, Math.round(Number(v) || 0));
        if (!s.keepRatio || multiple) return set({ [k]: n });
        set(k === "width" ? { width: n, height: Math.round((n * i.height) / i.width) } : { height: n, width: Math.round((n * i.width) / i.height) });
      };
      return (
        <>
          <SelectField
            label="Resize by"
            value={s.mode === "percent" ? "percent" : "exact"}
            onChange={(v) => set({ mode: v as ResizeMode })}
            options={[
              { value: "percent", label: "Percentage" },
              { value: "exact", label: multiple ? "Fit inside a width and height" : "Width and height" },
            ]}
          />
          {s.mode === "percent" ? (
            <RangeField label="Size" value={s.percent} min={5} max={400} step={5} onChange={(percent) => set({ percent })} format={(v) => `${v}%`} />
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <TextField label="Width (px)" type="number" className="w-32" value={String(s.width)} onChange={side("width")} />
                <TextField label="Height (px)" type="number" className="w-32" value={String(s.height)} onChange={side("height")} />
              </div>
              {!multiple && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.keepRatio} onChange={(e) => set({ keepRatio: e.target.checked })} className="size-4 accent-[var(--primary)]" />
                  Keep proportions
                </label>
              )}
            </>
          )}
          {!multiple && (
            <p className="text-sm text-muted-foreground">
              {i.width} × {i.height} → <strong className="text-foreground">{out.width} × {out.height}</strong> pixels
              {out.width > i.width && " (enlarging can look soft)"}
            </p>
          )}
          <Notes ctx={ctx} />
        </>
      );
    },
    validate: (s, ctx) => (ctx.files.every((f) => fitsLimits(resizedSize(img(f), resizeOf({ ...s, mode: multiple && s.mode === "exact" ? "fit" : s.mode })))) && (s.mode === "percent" || s.width > 0 || s.height > 0) ? null : imageErrorMessages.size),
    action: (_, ctx) => (ctx.files.length > 1 ? `Resize ${ctx.files.length} images` : "Resize image"),
    working: "Resizing…",
    run: (s, ctx, job) =>
      processAll(ctx, job, (p) => {
        const i = img(p);
        const size = resizedSize(i, resizeOf({ ...s, mode: multiple && s.mode === "exact" ? "fit" : s.mode }));
        return { recipe: { type: sameType(i), quality: 0.92, resize: size }, suffix: `${size.width}x${size.height}` };
      }),
  });

const RATIOS: { value: string; label: string; ratio: (i: ImageInfo) => number }[] = [
  { value: "free", label: "Free", ratio: () => 0 },
  { value: "original", label: "Original proportions", ratio: (i) => i.width / i.height },
  { value: "1", label: "Square (1:1)", ratio: () => 1 },
  { value: "4:3", label: "4:3", ratio: () => 4 / 3 },
  { value: "3:2", label: "3:2", ratio: () => 3 / 2 },
  { value: "16:9", label: "16:9", ratio: () => 16 / 9 },
  { value: "3:4", label: "3:4 (portrait)", ratio: () => 3 / 4 },
  { value: "9:16", label: "9:16 (portrait)", ratio: () => 9 / 16 },
];

interface CropS {
  ratio: string;
  rect: Rect;
}

const cropper: Config<CropS> = withImages({
  initial: (ctx) => ({ ratio: "free", rect: centredRect(img(ctx.first).width, img(ctx.first).height, 0) }),
  Settings: ({ s, set, ctx }) => {
    const i = img(ctx.first);
    const ratioOf = (v: string) => RATIOS.find((r) => r.value === v)!.ratio(i);
    return (
      <>
        <SelectField label="Aspect ratio" value={s.ratio} onChange={(ratio) => set({ ratio, rect: centredRect(i.width, i.height, ratioOf(ratio)) })} options={RATIOS} />
        <CropEditor file={ctx.first.file} size={i} rect={s.rect} ratio={ratioOf(s.ratio)} onChange={(rect) => set({ rect })} />
        <Notes ctx={ctx} />
      </>
    );
  },
  action: () => "Crop image",
  working: "Cropping…",
  run: (s, ctx, job) => processAll(ctx, job, (p) => ({ recipe: { type: sameType(img(p)), quality: 0.92, crop: s.rect }, suffix: "cropped" })),
});

const rotator: Config<{ angle: "90" | "180" | "270" }> = withImages({
  initial: () => ({ angle: "90" }),
  Settings: ({ s, set, ctx }) => (
    <>
      <SelectField
        label="Rotate"
        value={s.angle}
        onChange={(angle) => set({ angle })}
        options={[
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180° (upside down)" },
          { value: "270", label: "90° anticlockwise" },
        ]}
      />
      <Notes ctx={ctx} />
    </>
  ),
  action: () => "Rotate image",
  working: "Rotating…",
  run: (s, ctx, job) =>
    processAll(ctx, job, (p) => ({ recipe: { type: sameType(img(p)), quality: 0.92, rotate: Number(s.angle) as 90 | 180 | 270 }, suffix: "rotated" })),
});

const flipper: Config<{ dir: "h" | "v" | "both" }> = withImages({
  initial: () => ({ dir: "h" }),
  Settings: ({ s, set, ctx }) => (
    <>
      <SelectField
        label="Flip"
        value={s.dir}
        onChange={(dir) => set({ dir })}
        options={[
          { value: "h", label: "Horizontally (mirror left to right)" },
          { value: "v", label: "Vertically (top to bottom)" },
          { value: "both", label: "Both" },
        ]}
      />
      <Notes ctx={ctx} />
    </>
  ),
  action: () => "Flip image",
  working: "Flipping…",
  run: (s, ctx, job) =>
    processAll(ctx, job, (p) => ({ recipe: { type: sameType(img(p)), quality: 0.92, flipH: s.dir !== "v", flipV: s.dir !== "h" }, suffix: "flipped" })),
});

const metadataRemover: Config<object> = withImages({
  multiple: true,
  initial: () => ({}),
  action: (_, ctx) => (ctx.files.length > 1 ? `Remove metadata from ${ctx.files.length} images` : "Remove metadata"),
  working: "Removing metadata…",
  async run(_, ctx, job) {
    const files: ResultFile[] = [];
    const taken = new Set<string>();
    let removed = 0;
    for (const p of ctx.files) {
      if (job.signal?.aborted) throw new CancelledError();
      const out = stripMetadata(new Uint8Array(await p.file.arrayBuffer()));
      if (!out) throw new ImageError("decode");
      removed += out.removed;
      const ext = p.file.name.slice(p.file.name.lastIndexOf("."));
      files.push({ name: uniqueName(`${baseName(p.file)}-clean${ext}`, taken), blob: new Blob([out.bytes as BlobPart], { type: mimeOf[img(p).format!] }) });
    }
    return {
      title: removed ? "Metadata removed" : "No metadata found",
      files,
      preview: "images",
      zipName: "privora-clean-images.zip",
      summary: removed
        ? `Removed ${formatBytes(removed)} of metadata. The pixels are untouched, so there is no quality loss.`
        : "These files had no metadata to remove. They are unchanged.",
    };
  },
});

// ── edit ───────────────────────────────────────────────────────────────────

const POSITIONS: { value: Position | "tile"; label: string }[] = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom", label: "Bottom centre" },
  { value: "center", label: "Centre" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
  { value: "top", label: "Top centre" },
  { value: "tile", label: "Repeated across the image" },
];

interface WatermarkS {
  text: string;
  position: Position | "tile";
  size: number;
  color: string;
  opacity: number;
}

const watermark: Config<WatermarkS> = withImages({
  multiple: true,
  initial: () => ({ text: "© Your name", position: "bottom-right", size: 5, color: "#ffffff", opacity: 60 }),
  Settings: ({ s, set, ctx }) => (
    <>
      <TextField label="Watermark text" value={s.text} onChange={(text) => set({ text })} />
      <SelectField label="Position" value={s.position} onChange={(position) => set({ position })} options={POSITIONS} />
      <RangeField label="Text size" value={s.size} min={1} max={20} onChange={(size) => set({ size })} format={(v) => `${v}% of the width`} />
      <RangeField label="Opacity" value={s.opacity} min={10} max={100} step={5} onChange={(opacity) => set({ opacity })} format={(v) => `${v}%`} />
      <ColorField label="Colour" value={s.color} onChange={(color) => set({ color })} />
      <Notes ctx={ctx} />
    </>
  ),
  validate: (s) => (s.text.trim() ? null : imageErrorMessages.text),
  action: (_, ctx) => (ctx.files.length > 1 ? `Watermark ${ctx.files.length} images` : "Add watermark"),
  working: "Adding watermark…",
  run: (s, ctx, job) =>
    processAll(ctx, job, (p) => ({
      recipe: { type: sameType(img(p)), quality: 0.92, text: { style: "watermark", text: s.text.trim(), position: s.position, size: s.size, color: s.color, opacity: s.opacity } },
      suffix: "watermarked",
    })),
});

/** One-slider (or few-slider) effects that share the same flow. */
function effect<S>(o: {
  initial: (i: ImageInfo) => S;
  Settings?: Config<S>["Settings"];
  recipe: (s: S) => Partial<Recipe>;
  action: string;
  working: string;
  suffix: string;
}): Config<S> {
  const Inner = o.Settings;
  return withImages({
    initial: (ctx) => o.initial(img(ctx.first)),
    Settings: (props) => (
      <>
        {Inner && <Inner {...props} />}
        <Notes ctx={props.ctx} />
      </>
    ),
    action: () => o.action,
    working: o.working,
    run: (s, ctx, job) => processAll(ctx, job, (p) => ({ recipe: { type: sameType(img(p)), quality: 0.92, ...o.recipe(s) }, suffix: o.suffix })),
  });
}

const slider = (key: keyof Omit<Adjust, "grayscale">, label: string, start: number) =>
  effect<{ v: number }>({
    initial: () => ({ v: start }),
    Settings: ({ s, set }) => <RangeField label={label} value={s.v} min={-100} max={100} step={5} onChange={(v) => set({ v })} format={(v) => (v > 0 ? `+${v}` : `${v}`)} />,
    recipe: (s) => ({ adjust: { ...noAdjust, [key]: s.v } }),
    action: `Adjust ${label.toLowerCase()}`,
    working: "Adjusting…",
    suffix: key,
  });

const colours = effect<Omit<Adjust, "grayscale">>({
  initial: () => ({ brightness: 0, contrast: 0, saturation: 0 }),
  Settings: ({ s, set }) => (
    <>
      {(["brightness", "contrast", "saturation"] as const).map((k) => (
        <RangeField key={k} label={k[0].toUpperCase() + k.slice(1)} value={s[k]} min={-100} max={100} step={5} onChange={(v) => set({ [k]: v })} format={(v) => (v > 0 ? `+${v}` : `${v}`)} />
      ))}
    </>
  ),
  recipe: (s) => ({ adjust: { ...s, grayscale: false } }),
  action: "Apply colour changes",
  working: "Adjusting…",
  suffix: "adjusted",
});

const meme: Config<{ top: string; bottom: string }> = withImages({
  initial: () => ({ top: "", bottom: "" }),
  Settings: ({ s, set, ctx }) => (
    <>
      <TextField label="Top text" value={s.top} onChange={(top) => set({ top })} />
      <TextField label="Bottom text" value={s.bottom} onChange={(bottom) => set({ bottom })} />
      <Notes ctx={ctx} />
    </>
  ),
  validate: (s) => (s.top.trim() || s.bottom.trim() ? null : "Enter top or bottom text."),
  action: () => "Make meme",
  working: "Making your meme…",
  run: (s, ctx, job) =>
    processAll(ctx, job, (p) => ({ recipe: { type: sameType(img(p)) === "image/png" ? "image/png" : "image/jpeg", quality: 0.92, text: { style: "meme", text: s.top, bottom: s.bottom } }, suffix: "meme" })),
});

// ── utilities ──────────────────────────────────────────────────────────────

const viewer = (view: (p: PickedFile) => Promise<ToolResult["view"]>): Config<object> =>
  withImages({
    auto: true,
    initial: () => ({}),
    action: () => "Show",
    working: "Reading…",
    run: async (_, ctx) => ({ files: [], view: await view(ctx.first) }),
  });

/** Draw an image into a small canvas and return its pixels (for colour sampling). */
async function sample(file: Blob, side: number): Promise<Uint8ClampedArray> {
  const bitmap = await decodeImage(file);
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const c = makeCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  const g = context(c);
  g.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const data = g.getImageData(0, 0, c.width, c.height).data;
  c.width = c.height = 0;
  return data;
}

const paletteTool: Config<{ count: number }> = withImages({
  initial: () => ({ count: 6 }),
  Settings: ({ s, set }) => <RangeField label="Number of colours" value={s.count} min={2} max={16} onChange={(count) => set({ count })} />,
  action: () => "Generate palette",
  working: "Finding colours…",
  run: async (s, ctx) => ({ files: [], view: <PaletteView colours={palette(await sample(ctx.first.file, 300), s.count)} /> }),
});

const FAVICON_SIZES = [16, 32, 48, 180, 192, 512];
const FAVICON_HTML = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

const favicon: Config<{ fill: "none" | "white" }> = withImages({
  initial: (ctx) => ({ fill: img(ctx.first).alpha ? "none" : "white" }),
  Settings: ({ s, set, ctx }) => (
    <>
      <SelectField
        label="Background"
        value={s.fill}
        onChange={(fill) => set({ fill })}
        options={[
          { value: "none", label: "Transparent" },
          { value: "white", label: "White" },
        ]}
        hint="The Apple touch icon always gets a white background, because iOS shows transparent areas as black."
      />
      {img(ctx.first).width !== img(ctx.first).height && <p className="text-sm text-muted-foreground">Your image isn't square, so it's centred with empty space around it. For best results, crop it to a square first.</p>}
      <Notes ctx={ctx} />
    </>
  ),
  action: () => "Create favicons",
  working: "Creating favicons…",
  async run(s, ctx, job) {
    const bitmap = await decodeImage(ctx.first.file);
    const pngs = new Map<number, Blob>();
    try {
      for (const size of FAVICON_SIZES) {
        if (job.signal?.aborted) throw new CancelledError();
        const c = makeCanvas(size, size);
        const g = context(c);
        if (s.fill === "white" || size === 180) {
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, size, size);
        }
        const scale = Math.min(size / bitmap.width, size / bitmap.height);
        const w = bitmap.width * scale, h = bitmap.height * scale;
        g.imageSmoothingQuality = "high";
        g.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
        pngs.set(size, await toBlob(c, "image/png"));
      }
    } finally {
      bitmap.close();
    }
    const bytes = async (n: number) => new Uint8Array(await pngs.get(n)!.arrayBuffer());
    const ico = encodeIco(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await bytes(size) }))));
    return {
      title: "Your favicons are ready",
      files: [
        { name: "favicon.ico", blob: new Blob([ico as BlobPart], { type: "image/x-icon" }) },
        { name: "favicon-16x16.png", blob: pngs.get(16)! },
        { name: "favicon-32x32.png", blob: pngs.get(32)! },
        { name: "apple-touch-icon.png", blob: pngs.get(180)! },
        { name: "android-chrome-192x192.png", blob: pngs.get(192)! },
        { name: "android-chrome-512x512.png", blob: pngs.get(512)! },
      ],
      zipName: "favicons.zip",
      preview: "images",
      summary: (
        <span className="grid gap-2">
          <span>Upload the files to your site's root folder and add this to your page's &lt;head&gt;:</span>
          <code className="block overflow-x-auto rounded-md bg-surface-muted p-2 text-xs whitespace-pre text-foreground">{FAVICON_HTML}</code>
          <span>
            <CopyButton text={FAVICON_HTML} label="Copy HTML" />
          </span>
        </span>
      ),
    };
  },
});

const comparison: Config<object> = withImages({
  multiple: true,
  minFiles: 2,
  initial: () => ({}),
  validate: (_, ctx) => (ctx.files.length > 2 ? "Choose exactly two images. Remove the extra ones." : null),
  action: () => "Compare images",
  working: "Loading…",
  run: async (_, ctx) => {
    const [a, b] = ctx.files;
    const row = (p: PickedFile): [string, string] => [p.file.name, `${img(p).width} × ${img(p).height} · ${img(p).label} · ${formatBytes(p.file.size)}`];
    return {
      files: [],
      view: (
        <div className="grid gap-4">
          <Compare before={a.file} after={b.file} beforeLabel="First" afterLabel="Second" />
          <Facts rows={[row(a), row(b)]} />
          {(img(a).width !== img(b).width || img(a).height !== img(b).height) && (
            <p className="text-sm text-muted-foreground">The images have different sizes, so both are scaled to fit the same frame.</p>
          )}
        </div>
      ),
    };
  },
});

export const imageConfigs: Record<string, Config<any>> = {
  "image-converter": converter(false),
  "batch-image-converter": converter(true),
  "jpg-to-png": pair("image/png"),
  "png-to-jpg": pair("image/jpeg"),
  "jpg-to-webp": pair("image/webp"),
  "png-to-webp": pair("image/webp"),
  "webp-to-jpg": pair("image/jpeg"),
  "webp-to-png": pair("image/png"),
  "image-compressor": compressor(false),
  "batch-image-compressor": compressor(true),
  "image-resizer": resizer(false),
  "batch-image-resizer": resizer(true),
  "image-cropper": cropper,
  "image-rotator": rotator,
  "image-flipper": flipper,
  "remove-image-metadata": metadataRemover,
  "add-watermark-to-image": watermark,
  "blur-image": effect<{ radius: number }>({
    initial: (i) => ({ radius: Math.max(2, Math.round(Math.max(i.width, i.height) / 150)) }),
    Settings: ({ s, set }) => <RangeField label="Blur strength" value={s.radius} min={1} max={100} onChange={(radius) => set({ radius })} format={(v) => `${v} px`} />,
    recipe: (s) => ({ blur: s.radius }),
    action: "Blur image",
    working: "Blurring…",
    suffix: "blurred",
  }),
  "pixelate-image": effect<{ block: number }>({
    initial: (i) => ({ block: Math.max(4, Math.round(Math.max(i.width, i.height) / 60)) }),
    Settings: ({ s, set }) => <RangeField label="Pixel size" value={s.block} min={2} max={200} onChange={(block) => set({ block })} format={(v) => `${v} px`} />,
    recipe: (s) => ({ pixelate: s.block }),
    action: "Pixelate image",
    working: "Pixelating…",
    suffix: "pixelated",
  }),
  "grayscale-image": effect<object>({
    initial: () => ({}),
    recipe: () => ({ adjust: { ...noAdjust, grayscale: true } }),
    action: "Convert to grayscale",
    working: "Converting…",
    suffix: "grayscale",
  }),
  "adjust-image-brightness": slider("brightness", "Brightness", 20),
  "adjust-image-contrast": slider("contrast", "Contrast", 20),
  "adjust-image-saturation": slider("saturation", "Saturation", 30),
  "image-colour-adjustment": colours,
  "meme-generator": meme,
  "image-metadata-viewer": viewer(async (p) => <MetadataView groups={await readMetadata(p.file)} />),
  "image-info": viewer(async (p) => {
    const m = await readMetadata(p.file);
    const extra: [string, string][] = [];
    const ifd0 = m.ifd0 as Record<string, unknown> | undefined;
    const exif = m.exif as Record<string, unknown> | undefined;
    if (ifd0?.Make || ifd0?.Model) extra.push(["Camera", [ifd0.Make, ifd0.Model].filter(Boolean).join(" ")]);
    if (exif?.DateTimeOriginal instanceof Date) extra.push(["Taken", exif.DateTimeOriginal.toISOString().slice(0, 19).replace("T", " ")]);
    if (m.icc) extra.push(["Colour profile", String((m.icc as Record<string, unknown>).ProfileDescription ?? "Embedded")]);
    if (m.gps) extra.push(["Location", "Contains GPS coordinates"]);
    return <Facts rows={[...infoRows(p.file, img(p)), ...extra]} />;
  }),
  "image-colour-picker": viewer(async (p) => <ColourPicker file={p.file} />),
  "colour-palette-generator": paletteTool,
  "favicon-generator": favicon,
  "image-to-base64": viewer(async (p) => <Base64View file={p.file} mime={img(p).format ? mimeOf[img(p).format!] : p.file.type} />),
  "image-comparison": comparison,
};
