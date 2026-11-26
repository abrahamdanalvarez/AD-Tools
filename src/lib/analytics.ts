// Privacy-safe analytics adapter. DISABLED: every call is a no-op until a
// provider is approved and configured (Phase 09, see docs/PRIVACY.md).
//
// Only these events exist, and they carry only a page path or a registry tool
// ID. File names, sizes, contents, search queries and error text are never
// accepted, so they cannot be sent by mistake.

export type AnalyticsEvent =
  | { name: "page_view"; path: string }
  | { name: "tool_open"; toolId: string }
  | { name: "process_start"; toolId: string }
  | { name: "process_complete"; toolId: string }
  | { name: "process_fail"; toolId: string; reason: "unsupported" | "too-large" | "decode" | "encode" | "unknown" }
  | { name: "download"; toolId: string };

export const analyticsEnabled = false;

export function track(event: AnalyticsEvent): void {
  if (!analyticsEnabled) return;
  void event;
}
