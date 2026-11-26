import { useEffect, useId, useState } from "react";

/** Object URL for a blob, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(undefined);
    };
  }, [blob]);
  return url;
}

export const checker =
  "bg-[repeating-conic-gradient(var(--surface-muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]";

/**
 * Before/after slider: the "after" image is drawn over the "before" one and
 * clipped at the slider position. Both are scaled to the same box.
 */
export function Compare({ before, after, beforeLabel = "Before", afterLabel = "After" }: { before: Blob; after: Blob; beforeLabel?: string; afterLabel?: string }) {
  const a = useObjectUrl(before);
  const b = useObjectUrl(after);
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className={`relative w-full max-w-xl overflow-hidden rounded-lg border border-border ${checker}`}>
        <img src={a} alt={beforeLabel} className="block max-h-96 w-full object-contain" />
        <img
          src={b}
          alt={afterLabel}
          className="absolute inset-0 block size-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${pos}%` }} />
        <span aria-hidden className="absolute top-2 left-2 rounded bg-background/85 px-1.5 py-0.5 text-xs font-medium">
          {beforeLabel}
        </span>
        <span aria-hidden className="absolute top-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-xs font-medium">
          {afterLabel}
        </span>
      </div>
      <label htmlFor={id} className="sr-only">
        Comparison position: {beforeLabel} on the left, {afterLabel} on the right
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full max-w-xl accent-[var(--primary)]"
      />
    </div>
  );
}
