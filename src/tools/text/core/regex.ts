// Regular-expression matching and replacing. Pure, so it's unit-tested in Node,
// but in the app it only ever runs inside regex.worker.ts.

export const MAX_MATCHES = 5000;

export interface RegexRequest {
  pattern: string;
  flags: string;
  text: string;
  /** When set, replace instead of listing matches. */
  replace?: string;
}

export interface RegexMatch {
  index: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined> | null;
}

export type RegexResult = { kind: "matches"; matches: RegexMatch[]; total: number } | { kind: "replace"; text: string; count: number };

export function compile(pattern: string, flags: string): RegExp {
  if (!/^[dgimsuyv]*$/.test(flags) || new Set(flags).size !== flags.length) throw new Error(`"${flags}" isn't a valid set of flags.`);
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    throw new Error(String((err as Error).message).replace(/^Invalid regular expression: /, ""));
  }
}

export function regexJob({ pattern, flags, text, replace }: RegexRequest): RegexResult {
  if (replace !== undefined) {
    const re = compile(pattern, flags);
    const count = re.global ? [...text.matchAll(re)].length : re.test(text) ? 1 : 0;
    re.lastIndex = 0;
    // String.replace expands $1, $<name> and $& itself.
    return { kind: "replace", text: text.replace(re, replace), count };
  }
  // Always search globally to list every match; keep the user's other flags.
  const re = compile(pattern, flags.includes("g") ? flags : flags + "g");
  const matches: RegexMatch[] = [];
  let total = 0;
  for (const m of text.matchAll(re)) {
    total++;
    if (matches.length < MAX_MATCHES) matches.push({ index: m.index!, text: m[0], groups: m.slice(1), named: m.groups ? { ...m.groups } : null });
    if (!flags.includes("g")) break;
  }
  return { kind: "matches", matches, total };
}
