import { Suspense, useEffect } from "react";
import { icons } from "@/components/icons";
import { Breadcrumbs } from "@/components/tool/breadcrumbs";
import {
  Faqs,
  Instructions,
  Limitations,
  PrivacyNotice,
  RelatedTools,
  SupportedFormats,
} from "@/components/tool/tool-sections";
import { Spinner } from "@/components/ui/feedback";
import { track } from "@/lib/analytics";
import { categoryById, relatedTools } from "@/registry/registry";
import type { ToolDefinition } from "@/registry/types";
import { toolComponents } from "@/tools";

export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const Icon = icons[tool.icon];
  const Tool = toolComponents[tool.id];
  const category = categoryById(tool.category);

  useEffect(() => track({ name: "tool_open", toolId: tool.id }), [tool.id]);

  return (
    <div className="mx-auto grid max-w-4xl gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-5">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: category.name, href: `/#category-${category.id}` },
            { label: tool.name },
          ]}
        />
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text">
            <Icon aria-hidden className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
            <p className="mt-1 text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <PrivacyNotice ai={!!tool.model} />
      </div>

      <Suspense fallback={<Spinner label="Loading tool" />}>
        <Tool tool={tool} />
      </Suspense>

      {tool.steps && <Instructions steps={tool.steps} />}

      <section aria-labelledby="formats">
        <h2 id="formats" className="text-xl font-semibold">
          Supported formats
        </h2>
        <div className="mt-4">
          <SupportedFormats tool={tool} />
        </div>
        {tool.browsers.notes && <p className="mt-3 text-sm text-muted-foreground">{tool.browsers.notes}</p>}
      </section>

      <Limitations items={tool.limitations} />
      {tool.faqs && tool.faqs.length > 0 && <Faqs items={tool.faqs} />}
      <RelatedTools tools={relatedTools(tool)} />
    </div>
  );
}
