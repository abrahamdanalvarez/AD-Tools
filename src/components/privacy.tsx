import { CloudOff, Cpu, HardDrive, UserX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const privacyIndicators: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: Cpu, label: "100% On-Device Processing", detail: "Your browser does the work on your own computer." },
  { icon: CloudOff, label: "Zero File Uploads", detail: "Files never leave your device." },
  { icon: HardDrive, label: "Zero Server-Side File Storage", detail: "There is nowhere on our side to keep them." },
  { icon: UserX, label: "No Account Required", detail: "No sign-up, no email, no tracking profile." },
];

/** Compact row of indicators, e.g. under a hero or above a tool. */
export function PrivacyBadges({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {privacyIndicators.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium"
        >
          <Icon aria-hidden className="size-4 text-success-text" />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Full indicator grid with explanations. */
export function PrivacyGrid({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {privacyIndicators.map(({ icon: Icon, label, detail }) => (
        <li key={label} className="rounded-xl border border-border bg-surface p-5">
          <span className="grid size-10 place-items-center rounded-lg bg-success-soft text-success-text">
            <Icon aria-hidden className="size-5" />
          </span>
          <p className="mt-3 font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </li>
      ))}
    </ul>
  );
}
