import { useId } from "react";
import { Alert } from "@/components/ui/feedback";
import { formatBytes } from "@/lib/files";
import { imageErrorMessages } from "@/tools/image/core/errors";
import { decodeImage } from "@/tools/image/decode";
import type { OutputType } from "@/tools/image/render";
import { Compare } from "@/tools/image/ui/compare";
import { baseName, ColorField, Notes, OUT, outputs, Quality, webpProblem, withImages } from "@/tools/image/ui/configs";
import type { JobOptions } from "@/tools/pdf/run";
import { Field, SelectField } from "@/tools/pdf/ui/fields";
import type { Ctx, PdfToolConfig, ToolResult } from "@/tools/pdf/ui/shell";
import { composite, type Background } from "./composite";
import { birefnet } from "./model";
import { aiErrorMessages, subjectMask, type Mask } from "./segment";

const errors = { ...imageErrorMessages, ...aiErrorMessages };

function ModelNote() {
  return (
    <Alert tone="info" title={`One-time download: about ${birefnet.downloadMB} MB`}>
      The first time, your browser downloads the AI model from this website. After that it's cached and works offline. Your image never leaves your device.
    </Alert>
  );
}

const ranOn = (m: Mask) => `AI ran on your ${m.backend === "webgpu" ? "GPU" : "CPU"} in ${m.seconds.toFixed(1)} s`;

/** Decode, find the subject (cached per image), then build the output. */
async function cutOut(ctx: Ctx, job: JobOptions, build: (bitmap: ImageBitmap, mask: Mask) => Promise<Blob>) {
  const file = ctx.first.file;
  const bitmap = await decodeImage(file);
  try {
    const mask = await subjectMask(file, bitmap, job);
    job.onStatus?.("Creating your image…");
    return { blob: await build(bitmap, mask), mask, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

// ── remove background ──────────────────────────────────────────────────────

interface RemoveS {
  background: "transparent" | "colour" | "image";
  colour: string;
  image: File | null;
  type: OutputType;
  quality: number;
}

function BackgroundImageField({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const id = useId();
  return (
    <Field label="Background image" id={id} hint={file ? `${file.name} (${formatBytes(file.size)}). Stays on your device.` : "Choose a PNG, JPG or WebP. It fills the frame and is cropped to fit."}>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium"
      />
    </Field>
  );
}

const removeBackground: PdfToolConfig<RemoveS> = withImages({
  errors,
  initial: () => ({ background: "transparent", colour: "#ffffff", image: null, type: "image/png", quality: 90 }),
  Settings: ({ s, set, ctx }) => (
    <>
      <ModelNote />
      <SelectField
        label="Background"
        value={s.background}
        onChange={(background) => set({ background })}
        options={[
          { value: "transparent", label: "Transparent" },
          { value: "colour", label: "Solid colour" },
          { value: "image", label: "Your own image" },
        ]}
      />
      {s.background === "colour" && <ColorField label="Background colour" value={s.colour} onChange={(colour) => set({ colour })} />}
      {s.background === "image" && <BackgroundImageField file={s.image} onChange={(image) => set({ image })} />}
      <SelectField label="Save as" value={s.type} onChange={(type) => set({ type })} options={outputs().map((t) => ({ value: t, label: OUT[t].label }))} />
      {OUT[s.type].lossy && <Quality s={s} set={set} />}
      {s.type === "image/jpeg" && s.background === "transparent" && (
        <Alert tone="warning" title="JPG can't be transparent">
          The background will be white. Choose PNG or WebP to keep it transparent, or pick a background colour.
        </Alert>
      )}
      <Notes ctx={ctx} />
    </>
  ),
  validate: (s) => (s.background === "image" && !s.image ? "Choose a background image." : webpProblem(s.type)),
  action: () => "Remove background",
  working: "Removing the background…",
  run: async (s, ctx, job): Promise<ToolResult> => {
    let bgImage: ImageBitmap | undefined;
    try {
      if (s.background === "image") bgImage = await decodeImage(s.image!).catch(() => Promise.reject(new Error("ai-background")));
      const bg: Background =
        s.background === "image" ? { kind: "image", image: bgImage! } : s.background === "colour" ? { kind: "colour", colour: s.colour } : { kind: "transparent" };
      const out = await cutOut(ctx, job, (bitmap, mask) => composite(bitmap, mask, bg, s.type, s.quality / 100));
      return {
        title: "Your image is ready",
        files: [{ name: `${baseName(ctx.first.file)}-no-background.${OUT[s.type].ext}`, blob: out.blob }],
        summary: `${out.width} × ${out.height} · ${formatBytes(out.blob.size)} · ${ranOn(out.mask)}`,
        node: <Compare before={ctx.first.file} after={out.blob} />,
      };
    } finally {
      bgImage?.close();
    }
  },
});

// ── subject mask ───────────────────────────────────────────────────────────

const subjectMaskTool: PdfToolConfig<object> = withImages({
  errors,
  initial: () => ({}),
  Settings: ({ ctx }) => (
    <>
      <ModelNote />
      <Notes ctx={ctx} />
    </>
  ),
  action: () => "Create mask",
  working: "Finding the subject…",
  run: async (_s, ctx, job): Promise<ToolResult> => {
    const out = await cutOut(ctx, job, (bitmap, mask) => composite(bitmap, mask, { kind: "transparent" }, "image/png", 1, true));
    return {
      title: "Your mask is ready",
      files: [{ name: `${baseName(ctx.first.file)}-mask.png`, blob: out.blob }],
      summary: `${out.width} × ${out.height} · white is the subject, black is the background · ${ranOn(out.mask)}`,
      node: <Compare before={ctx.first.file} after={out.blob} afterLabel="Mask" />,
    };
  },
});

export const aiConfigs: Record<string, PdfToolConfig<any>> = {
  "remove-background": removeBackground,
  "ai-subject-mask": subjectMaskTool,
};
