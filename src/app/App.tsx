import { lazy, Suspense } from "react";
import { HomePage } from "@/app/HomePage";

// Component gallery for development only. `import.meta.env.DEV` is false in
// production builds, so the gallery and its import are removed from dist/.
const Styleguide = import.meta.env.DEV ? lazy(() => import("@/app/Styleguide")) : null;

export function App() {
  if (Styleguide && window.location.hash === "#styleguide") {
    return (
      <Suspense fallback={null}>
        <Styleguide />
      </Suspense>
    );
  }
  return <HomePage />;
}
