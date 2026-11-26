import type { PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { readBytes } from "../run";

/** Load a PDF with pdf.js for previews. Destroyed (memory freed) on unmount or change. */
export function usePdfDocument(blob: Blob | null) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setFailed(false);
    void (async () => {
      try {
        const { openDocument } = await import("../browser/pdfjs");
        loaded = await openDocument(await readBytes(blob));
        if (cancelled) void loaded.loadingTask.destroy();
        else setDoc(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      setDoc(null);
      void loaded?.loadingTask.destroy();
    };
  }, [blob]);
  return { doc, failed };
}

// pdf.js renders one page at a time per document; queue thumbnails so they don't fight.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(job: () => Promise<T>) => {
  const p = queue.then(job, job);
  queue = p.catch(() => {});
  return p;
};

/** A page thumbnail, rendered when it scrolls into view. */
export function PageThumb({
  doc,
  page,
  width = 120,
  label,
  decorative = false,
}: {
  doc: PDFDocumentProxy;
  page: number;
  width?: number;
  label: string;
  /** Inside a control that already names the page: hide it from assistive tech. */
  decorative?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let done = false;
    const draw = () =>
      enqueue(async () => {
        if (done) return;
        const p = await doc.getPage(page);
        const base = p.getViewport({ scale: 1 });
        const { renderPage } = await import("../browser/pdfjs");
        await renderPage(doc, page, (width * (window.devicePixelRatio || 1)) / base.width, canvas);
        if (!done) setReady(true);
      }).catch(() => {});
    if (typeof IntersectionObserver === "undefined") {
      void draw();
      return () => {
        done = true;
      };
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        void draw();
      }
    });
    io.observe(canvas);
    return () => {
      done = true;
      io.disconnect();
    };
  }, [doc, page, width]);
  return (
    // Fills its container up to `width`, so it never forces a layout wider than the screen.
    <span className="relative block w-full" style={{ maxWidth: width }}>
      {!ready && <Skeleton className="absolute inset-0 aspect-[3/4] h-auto w-full" />}
      <canvas
        ref={ref}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
        className={cn("block h-auto w-full rounded border border-border bg-white", !ready && "aspect-[3/4]")}
      />
    </span>
  );
}

/** Click thumbnails to choose pages. Mirrors the page-number text field. */
export function PageSelector({
  file,
  pageCount,
  selected,
  onToggle,
}: {
  file: Blob;
  pageCount: number;
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  const { doc, failed } = usePdfDocument(file);
  if (failed || pageCount > 300) return null; // the text field still works
  return (
    <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-border p-3">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
        {Array.from({ length: pageCount }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              aria-pressed={selected.has(i)}
              onClick={() => onToggle(i)}
              className={cn(
                "relative grid w-full justify-items-center gap-1 rounded-lg border-2 p-1.5 text-xs transition-colors",
                selected.has(i) ? "border-primary bg-primary-soft" : "border-transparent hover:border-border",
              )}
            >
              {doc ? <PageThumb doc={doc} page={i + 1} width={104} label={`Page ${i + 1}`} decorative /> : <Skeleton className="aspect-[3/4] w-full max-w-[104px]" />}
              <span>Page {i + 1}</span>
              {selected.has(i) && (
                <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check aria-hidden className="size-3" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Thumbnails with "move earlier/later" buttons. Keyboard and screen-reader friendly. */
export function PageOrder({ file, order, onChange }: { file: Blob; order: number[]; onChange: (order: number[]) => void }) {
  const { doc } = usePdfDocument(file);
  const move = (pos: number, d: -1 | 1) => {
    const next = [...order];
    [next[pos], next[pos + d]] = [next[pos + d], next[pos]];
    onChange(next);
  };
  return (
    <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-border p-3">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
        {order.map((page, pos) => (
          <li key={page} className="grid justify-items-center gap-1 rounded-lg border border-border p-2 text-xs">
            {doc ? <PageThumb doc={doc} page={page + 1} width={104} label={`Page ${page + 1}`} /> : <Skeleton className="aspect-[3/4] w-[104px]" />}
            <span>
              Position {pos + 1} · page {page + 1}
            </span>
            <span className="flex gap-1">
              <Button variant="outline" size="icon" aria-label={`Move page ${page + 1} earlier`} disabled={pos === 0} onClick={() => move(pos, -1)}>
                <ArrowLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Move page ${page + 1} later`}
                disabled={pos === order.length - 1}
                onClick={() => move(pos, 1)}
              >
                <ArrowRight aria-hidden />
              </Button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
