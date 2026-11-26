import { categoryById, visibleTools } from "./registry";
import type { ToolDefinition } from "./types";

// Runs entirely in the browser. Queries are never sent anywhere, including analytics.

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface Indexed {
  tool: ToolDefinition;
  name: string;
  keywords: string[];
  category: string;
  formats: string[];
}

function index(tool: ToolDefinition): Indexed {
  return {
    tool,
    name: normalise(tool.name),
    keywords: tool.keywords.map(normalise),
    category: normalise(`${categoryById(tool.category).name} ${tool.category}`),
    formats: [...tool.inputFormats, ...tool.outputFormats].map(normalise),
  };
}

function scoreTerm(entry: Indexed, term: string): number {
  if (entry.name === term) return 100;
  if (entry.name.split(" ").some((w) => w.startsWith(term))) return 40;
  if (entry.formats.includes(term)) return 30;
  if (entry.keywords.some((k) => k === term)) return 30;
  if (entry.keywords.some((k) => k.split(" ").some((w) => w.startsWith(term)))) return 20;
  if (entry.category.split(" ").some((w) => w.startsWith(term))) return 10;
  if (entry.name.includes(term) || entry.keywords.some((k) => k.includes(term))) return 5;
  return 0;
}

/** Every term must match somewhere. Results are ranked by score, then name. */
export function searchTools(query: string, list: ToolDefinition[] = visibleTools()): ToolDefinition[] {
  const q = normalise(query);
  if (!q) return [];
  const terms = q.split(" ");
  // Treat "to" in "png to jpg" as a separator, not a required term.
  const required = terms.filter((t) => t !== "to" || terms.length === 1);
  return list
    .map(index)
    .map((entry) => {
      const phraseBonus = entry.keywords.some((k) => k.includes(q)) ? 50 : 0;
      const scores = required.map((t) => scoreTerm(entry, t));
      return { tool: entry.tool, score: scores.every((s) => s > 0) ? scores.reduce((a, b) => a + b, 0) + phraseBonus : 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .map((r) => r.tool);
}
