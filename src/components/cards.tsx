import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface text-foreground shadow-xs", className)} {...props} />
  );
}

interface ToolCardProps {
  icon: LucideIcon;
  name: string;
  description: string;
  href?: string;
  badge?: ReactNode;
}

/** A single tool. The whole card is the link when `href` is set. */
export function ToolCard({ icon: Icon, name, description, href, badge }: ToolCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary-text">
          <Icon aria-hidden className="size-5" />
        </span>
        {badge}
      </div>
      <h3 className="mt-4 text-base font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </>
  );
  const base = "block rounded-xl border border-border bg-surface p-5 shadow-xs";
  return href ? (
    <a href={href} className={cn(base, "transition-shadow hover:border-primary/40 hover:shadow-md")}>
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}

interface CategoryCardProps {
  icon: LucideIcon;
  name: string;
  description: string;
  /** Number of available tools. 0 shows a "Coming soon" badge. */
  count: number;
  href?: string;
}

export function CategoryCard({ icon: Icon, name, description, count, href }: CategoryCardProps) {
  const available = count > 0;
  const body = (
    <>
      <Icon aria-hidden className="size-6 text-primary-text" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{name}</h3>
        {available ? (
          <Badge tone="primary">{count} tools</Badge>
        ) : (
          <Badge tone="neutral">Coming soon</Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </>
  );
  const base = "block rounded-xl border border-border bg-surface p-5";
  return available && href ? (
    <a href={href} className={cn(base, "shadow-xs transition-shadow hover:border-primary/40 hover:shadow-md")}>
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}
