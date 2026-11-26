import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { decodeImage } from "../decode";
import { hex } from "../core/pixels";

/** Write-only clipboard access, on request. Clipboard contents are never read. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(false), [text]);
  return (
    <Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(text).then(() => setDone(true))}>
      {done ? "Copied" : label}
    </Button>
  );
}

function hsl(r: number, g: number, b: number) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return `hsl(${Math.round(h * 60)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/** Longest side of the picking canvas: enough for any colour, small enough for phones. */
const MAX_SIDE = 2000;

export function ColourPicker({ file }: { file: Blob }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [rgb, setRgb] = useState<[number, number, number] | null>(null);
  const [failed, setFailed] = useState(false);
  // Until the image is drawn, the canvas is blank: ignore clicks so they don't pick a wrong colour.
  const ready = useRef(false);

  useEffect(() => {
    let live = true;
    ready.current = false;
    decodeImage(file)
      .then((bitmap) => {
        const c = canvas.current;
        if (!live || !c) return bitmap.close();
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        c.width = Math.round(bitmap.width * scale);
        c.height = Math.round(bitmap.height * scale);
        c.getContext("2d", { willReadFrequently: true })!.drawImage(bitmap, 0, 0, c.width, c.height);
        ready.current = true;
        bitmap.close();
        pick(Math.floor(c.width / 2), Math.floor(c.height / 2));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      const c = canvas.current;
      if (c) c.width = c.height = 0;
    };
  }, [file]);

  const pick = (x: number, y: number) => {
    const c = canvas.current;
    if (!c || !ready.current) return;
    x = Math.min(c.width - 1, Math.max(0, x));
    y = Math.min(c.height - 1, Math.max(0, y));
    const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(x, y, 1, 1).data;
    setPoint({ x, y });
    setRgb([d[0], d[1], d[2]]);
  };
  const onPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const box = e.currentTarget.getBoundingClientRect();
    pick(Math.floor(((e.clientX - box.left) / box.width) * e.currentTarget.width), Math.floor(((e.clientY - box.top) / box.height) * e.currentTarget.height));
  };
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || !point) return;
    e.preventDefault();
    pick(point.x + d[0], point.y + d[1]);
  };

  if (failed) return <p className="text-sm text-error-text">This image could not be opened.</p>;
  const c = canvas.current;
  const values = rgb && { hex: hex(...rgb), rgb: `rgb(${rgb.join(", ")})`, hsl: hsl(...rgb) };

  return (
    <div className="grid gap-4">
      <div className="relative w-full max-w-xl">
        <canvas
          ref={canvas}
          tabIndex={0}
          role="group"
          aria-label={`Image. Click a point to pick its colour, or use the arrow keys to move the picker (Shift moves faster).${values ? ` Picked ${values.hex}.` : ""}`}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onKeyDown={onKey}
          className="block h-auto w-full cursor-crosshair touch-none rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-primary"
        />
        {point && c && c.width > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_black]"
            style={{ left: `${((point.x + 0.5) / c.width) * 100}%`, top: `${((point.y + 0.5) / c.height) * 100}%` }}
          />
        )}
      </div>
      {values && (
        <div className="flex flex-wrap items-center gap-4" aria-live="polite">
          <span aria-hidden className="size-14 rounded-lg border border-border" style={{ background: values.hex }} />
          <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
            {(["hex", "rgb", "hsl"] as const).map((k) => (
              <div key={k} className="contents">
                <dt className="font-medium uppercase">{k}</dt>
                <dd className="font-mono">{values[k]}</dd>
                <dd>
                  <CopyButton text={values[k]} label={`Copy ${k.toUpperCase()}`} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
