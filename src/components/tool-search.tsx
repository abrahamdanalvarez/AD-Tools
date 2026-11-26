import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { icons } from "@/components/icons";
import { searchTools } from "@/registry/search";

/**
 * Local search over the tool registry. Results are links. The query is never
 * stored, put in the URL or sent anywhere.
 */
export function ToolSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchTools(query), [query]);
  const listId = useId();
  const statusId = useId();
  const active = query.trim().length > 0;

  return (
    <div className="relative max-w-xl">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Find a tool
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground" />
      <input
        id={`${listId}-input`}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Find a tool..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-describedby={statusId}
        aria-controls={active ? listId : undefined}
        className="h-12 w-full rounded-lg border border-input bg-surface pr-4 pl-11 text-base shadow-xs placeholder:text-muted-foreground"
      />
      <p id={statusId} className="sr-only" aria-live="polite">
        {active ? `${results.length} ${results.length === 1 ? "tool" : "tools"} found` : ""}
      </p>
      {active && (
        <div className="mt-2 rounded-lg border border-border bg-surface shadow-md">
          {results.length > 0 ? (
            <ul id={listId} className="p-1">
              {results.map((t) => {
                const Icon = icons[t.icon];
                return (
                  <li key={t.id}>
                    <a
                      href={`/${t.slug}/`}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-muted"
                    >
                      <Icon aria-hidden className="size-5 shrink-0 text-primary-text" />
                      <span>
                        <span className="block text-sm font-medium">{t.name}</span>
                        <span className="block text-xs text-muted-foreground">{t.description}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p id={listId} className="px-4 py-3 text-sm text-muted-foreground">
              No tools match “{query.trim()}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
