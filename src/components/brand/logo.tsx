import { cn } from "@/lib/utils";

// Same geometry as scripts/brand/generate-brand-assets.mjs.
const P = "M12 9H25A10.5 10.5 0 0 1 25 30H19.5V33.5Q19.5 37 15.75 40Q12 37 12 33.5Z";
const COUNTER = "M19.5 15.5H24.5A4 4 0 0 1 24.5 23.5H19.5Z";

/** Icon-only mark. Colours follow the light/dark theme tokens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="8 8.5 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <path fill="var(--logo-mark)" fillRule="evenodd" d={`${P} ${COUNTER}`} />
      <path fill="var(--logo-counter)" d={COUNTER} />
    </svg>
  );
}

/** Horizontal lockup: mark + wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark className="size-7" />
      <span className="font-heading text-xl font-bold tracking-tight text-foreground">Privora</span>
    </span>
  );
}
