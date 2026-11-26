import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="This page does not exist, or the tool is not available yet."
        action={
          <Button asChild>
            <a href="/">Go to all tools</a>
          </Button>
        }
      />
    </div>
  );
}
