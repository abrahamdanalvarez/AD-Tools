import { useEffect, useRef } from "react";

export function MarkdownPreview({ fragment, blocked }: { fragment: DocumentFragment; blocked: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Insert the sanitised DOM directly: no HTML string is ever handed to React.
    ref.current?.replaceChildren(fragment.cloneNode(true));
  }, [fragment]);
  return (
    <div className="grid gap-2">
      {blocked > 0 && <p className="text-sm text-muted-foreground">{blocked === 1 ? "1 image" : `${blocked} images`} from other websites not loaded, to protect your privacy.</p>}
      <div ref={ref} tabIndex={0} role="region" aria-label="Preview" className="prose-preview max-h-[32rem] overflow-auto rounded-md border border-border bg-background p-4" />
    </div>
  );
}
