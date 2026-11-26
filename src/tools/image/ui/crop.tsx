import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { TextField } from "@/tools/pdf/ui/fields";
import { checker, useObjectUrl } from "./compare";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Keep a rectangle inside the image, at least 1 px. */
export function clampRect(r: Rect, w: number, h: number): Rect {
  const width = Math.round(Math.min(w, Math.max(1, r.width)));
  const height = Math.round(Math.min(h, Math.max(1, r.height)));
  return {
    x: Math.round(Math.min(w - width, Math.max(0, r.x))),
    y: Math.round(Math.min(h - height, Math.max(0, r.y))),
    width,
    height,
  };
}

/** Largest centred rectangle with this aspect ratio (0 = keep the whole image). */
export function centredRect(w: number, h: number, ratio: number): Rect {
  if (!ratio) return { x: 0, y: 0, width: w, height: h };
  const width = Math.min(w, h * ratio);
  const height = width / ratio;
  return clampRect({ x: (w - width) / 2, y: (h - height) / 2, width, height }, w, h);
}

/**
 * Drag the box to move it, or its corner to resize it. Arrow keys move it
 * (Shift: faster); exact numbers can be typed below.
 */
export function CropEditor({ file, size, rect, ratio, onChange }: { file: Blob; size: { width: number; height: number }; rect: Rect; ratio: number; onChange: (r: Rect) => void }) {
  const url = useObjectUrl(file);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize"; x: number; y: number; start: Rect } | null>(null);
  const { width: W, height: H } = size;

  const set = (r: Rect) => onChange(clampRect(r, W, H));
  const withRatio = (r: Rect, from: "width" | "height") =>
    ratio ? (from === "width" ? { ...r, height: r.width / ratio } : { ...r, width: r.height * ratio }) : r;

  const down = (mode: "move" | "resize") => (e: PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: rect };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    const box = frame.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = ((e.clientX - d.x) / box.width) * W;
    const dy = ((e.clientY - d.y) / box.height) * H;
    if (d.mode === "move") set({ ...d.start, x: d.start.x + dx, y: d.start.y + dy });
    else {
      const r = withRatio({ ...d.start, width: d.start.width + dx, height: d.start.height + dy }, "width");
      // With a fixed ratio, shrink to fit inside the image instead of breaking the ratio.
      const fit = Math.min(1, (W - r.x) / r.width, (H - r.y) / r.height);
      set({ ...r, width: r.width * fit, height: r.height * fit });
    }
  };
  const key = (e: KeyboardEvent) => {
    const step = (e.shiftKey ? 0.1 : 0.01) * Math.max(W, H);
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    set({ ...rect, x: rect.x + d[0], y: rect.y + d[1] });
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const num = (label: string, field: keyof Rect) => (
    <TextField
      label={label}
      type="number"
      className="w-28"
      value={String(rect[field])}
      onChange={(v) => {
        const r = { ...rect, [field]: Number(v) || 0 };
        set(field === "width" || field === "height" ? withRatio(r, field) : r);
      }}
    />
  );

  return (
    <div className="grid gap-3">
      <div ref={frame} className={`relative w-full max-w-xl touch-none overflow-hidden select-none ${checker}`} onPointerMove={move} onPointerUp={() => (drag.current = null)}>
        <img src={url} alt="" className="block w-full" draggable={false} />
        <div
          role="group"
          tabIndex={0}
          aria-label={`Crop area, ${rect.width} × ${rect.height} pixels at ${rect.x}, ${rect.y}. Drag it or use the arrow keys to move it (Shift moves faster).`}
          onPointerDown={down("move")}
          onKeyDown={key}
          className="absolute cursor-move outline-2 outline-dashed outline-primary focus-visible:outline-4"
          style={{
            left: pct(rect.x, W),
            top: pct(rect.y, H),
            width: pct(rect.width, W),
            height: pct(rect.height, H),
            // Darken everything outside the crop area.
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)",
          }}
        >
          <span
            aria-hidden
            onPointerDown={down("resize")}
            className="absolute right-0 bottom-0 size-4 cursor-nwse-resize rounded-sm border-2 border-background bg-primary"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {num("Left (px)", "x")}
        {num("Top (px)", "y")}
        {num("Width (px)", "width")}
        {num("Height (px)", "height")}
      </div>
    </div>
  );
}
