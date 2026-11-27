// Tool IDs served by the typed-input shell, split so each page loads only its group's code.
export const devToolIds = [
  "json-formatter", "json-validator", "json-minifier", "xml-formatter", "html-formatter", "css-formatter", "javascript-formatter",
  "sql-formatter", "yaml-formatter", "base64-encoder-decoder", "url-encoder-decoder", "html-entity-encoder-decoder", "jwt-decoder",
  "uuid-generator", "password-generator", "random-string-generator", "hash-generator", "qr-code-generator", "slug-generator",
  "cron-expression-generator", "json-to-csv", "csv-to-json", "json-to-yaml", "yaml-to-json", "json-to-xml", "xml-to-json",
  "regex-tester", "unix-timestamp-converter", "date-format-converter", "markdown-preview", "colour-converter", "hex-to-rgb",
  "rgb-to-hex", "css-gradient-generator", "css-shadow-generator",
] as const;

export const textToolIds = [
  "word-counter", "character-counter", "sentence-counter", "paragraph-counter", "text-case-converter", "uppercase-converter",
  "lowercase-converter", "title-case-converter", "remove-duplicate-lines", "sort-text-lines", "reverse-text", "remove-extra-spaces",
  "remove-empty-lines", "find-and-replace", "text-cleaner", "text-diff-checker", "reading-time-calculator", "lorem-ipsum-generator",
  "markdown-editor",
] as const;

export const calcToolIds = [
  "unit-converter", "percentage-calculator", "date-calculator", "age-calculator", "time-duration-calculator", "loan-calculator",
  "bmi-calculator", "tip-calculator", "discount-calculator", "file-size-converter",
] as const;
