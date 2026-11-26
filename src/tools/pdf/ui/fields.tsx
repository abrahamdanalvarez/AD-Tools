import { useId, type ReactNode } from "react";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPages, parsePages } from "../core/ranges";
import { PageSelector } from "./pages";

export function Field({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} className="sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
  multiline,
  autoComplete = "off",
  className = "sm:w-72",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  type?: "text" | "password" | "number";
  multiline?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-96"
        />
      ) : (
        <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={className} spellCheck={false} />
      )}
    </Field>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => `${v}`,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <Field label={`${label}: ${format(value)}`} id={id}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)] sm:w-72"
      />
    </Field>
  );
}

/** Try to read a page list; null when it isn't valid. */
export function tryPages(text: string, count: number): number[] | null {
  try {
    return parsePages(text, count);
  } catch {
    return null;
  }
}

/** Page numbers as text, plus clickable thumbnails that edit the same value. */
export function PagesField({
  label,
  value,
  onChange,
  file,
  pageCount,
  hint = "For example 1-3, 5, 8-. Or click pages below.",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  file: Blob;
  pageCount: number;
  hint?: string;
}) {
  const selected = new Set(tryPages(value, pageCount) ?? []);
  return (
    <div className="grid gap-3">
      <TextField label={label} value={value} onChange={onChange} hint={hint} />
      <PageSelector
        file={file}
        pageCount={pageCount}
        selected={selected}
        onToggle={(i) => {
          const next = new Set(selected);
          if (next.has(i)) next.delete(i);
          else next.add(i);
          onChange(formatPages([...next]));
        }}
      />
    </div>
  );
}
