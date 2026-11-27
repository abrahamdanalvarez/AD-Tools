// Runs a user's regular expression away from the page. A pattern that
// backtracks for too long is stopped by terminating this worker (see regex.ts).
import { regexJob, type RegexRequest } from "./core/regex";

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  try {
    self.postMessage({ ok: true, result: regexJob(event.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err as Error).message ?? err) });
  }
};
