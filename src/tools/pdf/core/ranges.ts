import { PdfError } from "./errors";

/**
 * Parse "1-3, 5, 8-" style page ranges (1-based, as people type them) into
 * groups of 0-based page indexes. "8-" means "8 to the end". Throws "range".
 */
export function parseRangeGroups(input: string, pageCount: number): number[][] {
  const parts = input
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new PdfError("range");
  return parts.map((part) => {
    const m = /^(\d+)?\s*(?:(-)\s*(\d+)?)?$/.exec(part);
    if (!m || (!m[1] && !m[3])) throw new PdfError("range");
    const start = m[1] ? Number(m[1]) : 1;
    const end = m[2] ? (m[3] ? Number(m[3]) : pageCount) : start;
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) throw new PdfError("range");
    const out: number[] = [];
    if (start <= end) for (let i = start; i <= end; i++) out.push(i - 1);
    else for (let i = start; i >= end; i--) out.push(i - 1);
    return out;
  });
}

/** Flat, de-duplicated, in the order given. */
export function parsePages(input: string, pageCount: number): number[] {
  return [...new Set(parseRangeGroups(input, pageCount).flat())];
}

/** [0,1,2,4] → "1-3, 5" */
export function formatPages(indexes: number[]): string {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    out.push(start === sorted[i] ? `${start + 1}` : `${start + 1}-${sorted[i] + 1}`);
  }
  return out.join(", ");
}
