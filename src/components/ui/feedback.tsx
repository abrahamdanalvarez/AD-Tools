import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Progress as ProgressPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Alert: errors, warnings, success and info messages ───────────────── */

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-sm", {
  variants: {
    tone: {
      info: "border-primary/30 bg-primary-soft text-foreground [&>svg]:text-primary-text",
      success: "border-success/30 bg-success-soft text-foreground [&>svg]:text-success-text",
      warning: "border-warning/40 bg-warning-soft text-foreground [&>svg]:text-warning-text",
      error: "border-error/30 bg-error-soft text-foreground [&>svg]:text-error-text",
    },
  },
  defaultVariants: { tone: "info" },
});

const alertIcons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

export interface AlertProps extends Omit<ComponentProps<"div">, "title">, VariantProps<typeof alertVariants> {
  title?: ReactNode;
}

export function Alert({ className, tone = "info", title, children, ...props }: AlertProps) {
  const Icon = alertIcons[tone ?? "info"];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

/* ── Progress bar ──────────────────────────────────────────────────────── */

export interface ProgressProps extends ComponentProps<typeof ProgressPrimitive.Root> {
  /** 0–100. Leave undefined for an indeterminate bar. */
  value?: number;
}

export function Progress({ className, value, ...props }: ProgressProps) {
  const indeterminate = value === undefined;
  return (
    <ProgressPrimitive.Root
      value={indeterminate ? null : value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full bg-primary transition-[width] duration-300",
          indeterminate && "w-1/3 animate-progress-slide",
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

/* ── Loading states ────────────────────────────────────────────────────── */

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      <span>{label}</span>
    </span>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-muted", className)} {...props} />;
}

/* ── Badge ─────────────────────────────────────────────────────────────── */

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      // Outlined, not filled: muted text on surface-muted is only 4.34:1.
      neutral: "border border-border text-muted-foreground",
      primary: "bg-primary-soft text-primary-text",
      success: "bg-success-soft text-success-text",
      warning: "bg-warning-soft text-warning-text",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
