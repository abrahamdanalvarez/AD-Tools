import { LogoMark } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span>
            Privora — Developed and maintained by{" "}
            <a href="https://abrahamdan.com" className="font-medium text-foreground underline-offset-4 hover:underline">
              Abraham Dan Alvarez
            </a>
            .
          </span>
        </p>
        <p>Your files. Your device. Your privacy.</p>
      </div>
    </footer>
  );
}
