// Code formatters. Prettier and sql-formatter only parse the code into a
// syntax tree and print it again: nothing is ever run. Lazy-loaded per language.
import { InputError } from "./encode";

export type CodeLanguage = "javascript" | "typescript" | "css" | "scss" | "less" | "html";

function prettierError(err: unknown): never {
  const e = err as { message?: string; loc?: { start?: { line: number; column: number } } };
  const at = e.loc?.start;
  // Prettier messages end with a code frame; keep the first line.
  const reason = (e.message ?? "").split("\n")[0].replace(/\s*\(\d+:\d+\)$/, "");
  throw new InputError(`Couldn't format: ${reason}${at ? ` (line ${at.line}, column ${at.column})` : ""}`);
}

export async function formatCode(code: string, language: CodeLanguage, opts: { indent: 2 | 4 | "tab"; printWidth: number; semi?: boolean; singleQuote?: boolean }): Promise<string> {
  if (!code.trim()) throw new InputError("Enter some code.");
  const [{ format }, babel, estree, postcss, html, typescript] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/postcss"),
    language === "html" ? import("prettier/plugins/html") : null,
    language === "typescript" ? import("prettier/plugins/typescript") : null,
  ]);
  const parser = { javascript: "babel", typescript: "typescript", css: "css", scss: "scss", less: "less", html: "html" }[language];
  try {
    return await format(code, {
      parser,
      plugins: [babel, estree, postcss, ...(html ? [html] : []), ...(typescript ? [typescript] : [])],
      tabWidth: opts.indent === "tab" ? 2 : opts.indent,
      useTabs: opts.indent === "tab",
      printWidth: opts.printWidth,
      semi: opts.semi ?? true,
      singleQuote: opts.singleQuote ?? false,
      // HTML: keep inline elements' whitespace as the browser would render it.
      htmlWhitespaceSensitivity: "css",
      embeddedLanguageFormatting: "auto",
    });
  } catch (err) {
    prettierError(err);
  }
}

export type SqlDialect = "sql" | "mysql" | "postgresql" | "sqlite" | "transactsql" | "plsql" | "bigquery" | "mariadb";

export async function formatSql(sql: string, opts: { dialect: SqlDialect; indent: 2 | 4 | "tab"; keywordCase: "upper" | "lower" | "preserve" }): Promise<string> {
  if (!sql.trim()) throw new InputError("Enter some SQL.");
  const { format } = await import("sql-formatter");
  try {
    return format(sql, {
      language: opts.dialect,
      tabWidth: opts.indent === "tab" ? 2 : opts.indent,
      useTabs: opts.indent === "tab",
      keywordCase: opts.keywordCase,
    });
  } catch (err) {
    throw new InputError(`Couldn't format: ${String((err as Error).message).split("\n")[0]}`);
  }
}

