import { lazy, Suspense, useEffect } from "react";
import { CreditsPage } from "@/app/CreditsPage";
import { HomePage } from "@/app/HomePage";
import { Layout } from "@/app/Layout";
import { NotFoundPage } from "@/app/NotFoundPage";
import { resolveRoute } from "@/app/routes";
import { ToolPage } from "@/app/ToolPage";
import { HOME_TITLE, staticPages } from "@/site";

// Component gallery for development only. `import.meta.env.DEV` is false in
// production builds, so the gallery and its import are removed from dist/.
const Styleguide = import.meta.env.DEV ? lazy(() => import("@/app/Styleguide")) : null;

/**
 * Each route is also a real HTML file in dist/ (see scripts/static-routes.ts),
 * so links are plain page loads and refresh works on any static host.
 */
export function App({ pathname = window.location.pathname }: { pathname?: string }) {
  const route = resolveRoute(pathname);

  useEffect(() => {
    if (route.kind === "tool") document.title = route.tool.seoTitle;
    else if (route.kind === "credits") document.title = staticPages[0].title;
    else if (route.kind === "not-found") document.title = "Page not found | Privora";
    else document.title = HOME_TITLE;
  }, [route]);

  if (Styleguide && window.location.hash === "#styleguide") {
    return (
      <Suspense fallback={null}>
        <Styleguide />
      </Suspense>
    );
  }

  return (
    <Layout>
      {route.kind === "home" && <HomePage />}
      {route.kind === "tool" && <ToolPage tool={route.tool} />}
      {route.kind === "credits" && <CreditsPage />}
      {route.kind === "not-found" && <NotFoundPage />}
    </Layout>
  );
}
