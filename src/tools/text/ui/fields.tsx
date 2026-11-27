// Inputs for the text, developer and productivity tools. Every text box has
// spellcheck and autocomplete off: some browsers send spellchecked text to an
// online service, and autocomplete would store what the user typed.
import { useId, type ReactNode } from "react";
import { Input, Label } from "@/components/ui/input";
import { Field } from "@/tools/pdf/ui/fields";

export { RangeField, SelectField } from "@/tools/pdf/ui/fields";

const box = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function TextArea({
  label,
  value,
  onChange,
  rows = 8,
  mono = false,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        onChange={(e) => onChange(e.target.value)}
        className={`${box} ${mono ? "font-mono" : ""} min-h-24 resize-y`}
      />
    </Field>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  inputMode,
  className = "sm:w-72",
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "time" | "datetime-local" | "password";
  placeholder?: string;
  hint?: ReactNode;
  inputMode?: "decimal" | "numeric" | "text";
  className?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <span className="flex items-center gap-2">
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </span>
    </Field>
  );
}

/** A number typed as text, so partial input ("1.", "-") isn't lost while typing. */
export const NumberInput = (p: Omit<Parameters<typeof TextInput>[0], "type" | "inputMode">) => <TextInput {...p} inputMode="decimal" />;

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

export function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-20 cursor-pointer rounded-md border border-input bg-background p-1" />
    </div>
  );
}

/** Lays fields out side by side on wide screens. */
export const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-end gap-4">{children}</div>;
