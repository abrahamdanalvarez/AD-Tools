import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { PageThumb, usePdfDocument } from "./pages";

export interface Point {
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Shows one page and a box the user drags (or moves with the arrow keys) to
 * where something should go. Positions are fractions of the visible page,
 * from its top-left corner, so they don't depend on screen size.
 */
export function PlacementEditor({
  file,
  page,
  value,
  onChange,
  boxWidth,
  boxHeight,
  children,
  label,
}: {
  file: Blob;
  /** 0-based */
  page: number;
  value: Point;
  onChange: (p: Point) => void;
  /** Box size as fractions of the page. */
  boxWidth: number;
  boxHeight: number;
  /** Rendered inside the box, scaled by `scale` (screen px per PDF point). */
  children: (scale: number) => ReactNode;
  label: string;
}) {
  const { doc, failed } = usePdfDocument(file);
  const [pageWidthPt, setPageWidthPt] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  useEffect(() => {
    if (!doc) return;
    let live = true;
    void doc.getPage(page + 1).then((p) => live && setPageWidthPt(p.getViewport({ scale: 1 }).width));
    return () => {
      live = false;
    };
  }, [doc, page]);

  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setDisplayWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  const maxX = Math.max(0, 1 - boxWidth);
  const maxY = Math.max(0, 1 - boxHeight);
  const move = (x: number, y: number) => onChange({ x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) });

  const at = (e: PointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const p = at(e);
    drag.current = { dx: p.x - value.x, dy: p.y - value.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    const p = at(e);
    move(p.x - drag.current.dx, p.y - drag.current.dy);
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    move(value.x + d[0], value.y + d[1]);
  };

  if (failed) return <p className="text-sm text-muted-foreground">The page preview isn't available. The position fields still work.</p>;

  return (
    <div className="grid gap-2">
      <div ref={frame} className="relative w-full max-w-md touch-none select-none">
        {doc ? <PageThumb doc={doc} page={page + 1} width={448} label={`Page ${page + 1}`} /> : <Skeleton className="aspect-[3/4] w-full" />}
        {doc && (
          <div
            role="group"
            tabIndex={0}
            aria-label={`${label}. Drag it, or use the arrow keys to move it (Shift moves faster). ${Math.round(value.x * 100)}% from the left, ${Math.round(value.y * 100)}% from the top.`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={onKey}
            className="absolute cursor-move overflow-hidden rounded-sm outline-2 outline-dashed outline-primary focus-visible:outline-4"
            style={{
              left: `${value.x * 100}%`,
              top: `${value.y * 100}%`,
              width: `${boxWidth * 100}%`,
              height: `${boxHeight * 100}%`,
              maxWidth: "100%",
            }}
          >
            {children(pageWidthPt ? displayWidth / pageWidthPt : 0)}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {Math.round(value.x * 100)}% from the left, {Math.round(value.y * 100)}% from the top
      </p>
    </div>
  );
}

/** Page width in points (visible orientation), for converting sizes. */
export function usePageWidth(file: Blob, page: number) {
  const { doc } = usePdfDocument(file);
  const [w, setW] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!doc) return;
    let live = true;
    void doc.getPage(page + 1).then((p) => {
      const v = p.getViewport({ scale: 1 });
      if (live) setW({ width: v.width, height: v.height });
    });
    return () => {
      live = false;
    };
  }, [doc, page]);
  return w;
}
