import type { Faq, IconKey, ToolCategory, ToolDefinition } from "./types";

// Developer, text, productivity and file tools (Phase 07). Everything runs in
// the browser: what users type stays in page memory and is never uploaded,
// stored or put in the address bar.

// Intl.Segmenter, lookbehind regex, module workers: Chrome/Edge 111, Firefox 114, Safari 16.4.
const browsers = { chrome: "111", edge: "111", firefox: "114", safari: "16.4" };

const typedFaq: Faq = {
  q: "Is what I type sent anywhere?",
  a: "No. Everything runs in your browser on your device. What you type or paste is never uploaded, saved or added to the page address, and it's gone when you leave or reload the page.",
};
const fileFaq: Faq = {
  q: "Are my files uploaded?",
  a: "No. Your browser reads the file on your device. It is never sent to a server, and nothing is kept after you leave the page.",
};

const sensitive = "Don't paste passwords, keys or personal data into tools you don't trust. This one runs only on your device, but other websites may not.";

interface Spec {
  id: string;
  name: string;
  icon: IconKey;
  description: string;
  seo: string;
  keywords: string[];
  related: string[];
  engine?: string;
  input?: string[];
  output?: string[];
  popular?: boolean;
  limitations?: string[];
  steps?: string[];
  faqs?: Faq[];
  maxMB?: number;
  mode?: ToolDefinition["processingMode"];
}

const make =
  (category: ToolCategory, defaults: { engine: string; input: string[]; output: string[]; steps: string[]; limitations: string[]; faq: Faq }) =>
  (s: Spec): ToolDefinition => ({
    id: s.id,
    name: s.name,
    slug: s.id,
    category,
    description: s.description,
    icon: s.icon,
    keywords: s.keywords,
    engine: s.engine ?? defaults.engine,
    processingMode: s.mode ?? "main-thread",
    inputFormats: s.input ?? defaults.input,
    outputFormats: s.output ?? defaults.output,
    browsers,
    maxFileSizeMB: s.maxMB ?? 5,
    model: null,
    enabled: true,
    status: "verified",
    popular: s.popular ?? false,
    seoTitle: `${s.name} — Free & Private Online Tool | Privora`,
    seoDescription: s.seo,
    related: s.related,
    limitations: [...(s.limitations ?? []), ...defaults.limitations],
    steps: s.steps ?? defaults.steps,
    faqs: [defaults.faq, ...(s.faqs ?? [])],
  });

const typedSteps = ["Type or paste into the box.", "Adjust the options if you need to. The result updates as you type.", "Copy the result or download it."];
const textLimit = "Up to 5 million characters. Very long text may be slow on phones.";

const dev = make("developer", { engine: "Browser JavaScript", input: ["text"], output: ["txt"], steps: typedSteps, limitations: [textLimit], faq: typedFaq });
const text = make("text", { engine: "Browser JavaScript", input: ["text"], output: ["txt"], steps: typedSteps, limitations: [textLimit], faq: typedFaq });
const calc = make("productivity", {
  engine: "Browser JavaScript",
  input: ["values"],
  output: [],
  steps: ["Enter your numbers or dates.", "The result updates as you type.", "Read the notes under the result: they explain what the calculation assumes."],
  limitations: ["Results are for general information. Check important figures (money, health) with a professional."],
  faq: { q: "Is what I enter saved or sent anywhere?", a: "No. The calculation runs in your browser. Nothing you enter is uploaded or stored, and it's gone when you leave the page." },
});
const file = make("file", { engine: "fflate (ZIP) and hash-wasm, in the browser", input: ["*"], output: [], steps: [], limitations: [], faq: fileFaq });

const PRETTIER = "Prettier (parses and prints code; never runs it)";

export const devTools = (): ToolDefinition[] => [
  dev({
    id: "json-formatter", name: "JSON Formatter", icon: "braces", popular: true,
    description: "Format and beautify JSON with your choice of indent, and sort keys.",
    seo: "Format, beautify and pretty-print JSON in your browser. Choose the indent and sort keys. Free, private, no sign-up.",
    keywords: ["json formatter", "json beautifier", "pretty print json", "format json", "json viewer", "json pretty"],
    related: ["json-validator", "json-minifier", "json-to-csv"], output: ["json"],
    limitations: ["Duplicate keys keep only the last value, as in JavaScript. Very large numbers lose precision beyond 15–17 digits."],
  }),
  dev({
    id: "json-validator", name: "JSON Validator", icon: "braces",
    description: "Check whether JSON is valid and see where the first error is.",
    seo: "Validate JSON instantly and find the line and column of any syntax error. Runs in your browser, so your data stays private.",
    keywords: ["json validator", "validate json", "json lint", "json checker", "json syntax error"],
    related: ["json-formatter", "json-minifier", "yaml-to-json"], output: [],
    limitations: ["Checks JSON syntax (RFC 8259), not a JSON Schema. Some browsers don't give the error position, so only the reason is shown."],
  }),
  dev({
    id: "json-minifier", name: "JSON Minifier", icon: "minimize",
    description: "Remove whitespace from JSON to make it as small as possible.",
    seo: "Minify JSON by removing spaces and line breaks, and see how much smaller it gets. Free and private: runs in your browser.",
    keywords: ["json minifier", "minify json", "compress json", "json compact", "json one line"],
    related: ["json-formatter", "json-validator"], output: ["json"],
  }),
  dev({
    id: "xml-formatter", name: "XML Formatter", icon: "file-code",
    description: "Indent XML neatly, or minify it to one line.",
    seo: "Format and indent XML, or minify it, in your browser. Keeps comments and CDATA. Free, private, no upload.",
    keywords: ["xml formatter", "xml beautifier", "pretty print xml", "format xml", "xml minify"],
    related: ["xml-to-json", "html-formatter", "json-formatter"], output: ["xml"], engine: "Browser DOMParser (no external entities are loaded)",
    limitations: ["Whitespace inside elements with child elements is reformatted. External DTDs and entities are never loaded."],
  }),
  dev({
    id: "html-formatter", name: "HTML Formatter", icon: "code",
    description: "Format and indent HTML, including the CSS and JavaScript inside it.",
    seo: "Beautify and indent HTML code with Prettier in your browser. The code is only formatted, never run. Free and private.",
    keywords: ["html formatter", "html beautifier", "format html", "pretty print html", "indent html"],
    related: ["css-formatter", "javascript-formatter", "markdown-preview"], output: ["html"], engine: PRETTIER,
    limitations: ["The HTML is formatted as text and never shown or run. Prettier may move inline whitespace where it doesn't change how the page looks."],
  }),
  dev({
    id: "css-formatter", name: "CSS Formatter", icon: "brush",
    description: "Format CSS, SCSS and Less with consistent indentation.",
    seo: "Beautify CSS, SCSS and Less code with Prettier, right in your browser. Free, private and nothing is uploaded.",
    keywords: ["css formatter", "css beautifier", "format css", "scss formatter", "less formatter"],
    related: ["html-formatter", "javascript-formatter", "css-gradient-generator"], output: ["css"], engine: PRETTIER,
  }),
  dev({
    id: "javascript-formatter", name: "JavaScript Formatter", icon: "file-code",
    description: "Format JavaScript and TypeScript code with Prettier.",
    seo: "Beautify JavaScript and TypeScript with Prettier in your browser. Your code is only parsed, never run or uploaded.",
    keywords: ["javascript formatter", "js beautifier", "format javascript", "typescript formatter", "prettier online"],
    related: ["html-formatter", "css-formatter", "json-formatter"], output: ["js", "ts"], engine: PRETTIER,
    limitations: ["The code is parsed and printed again, never run. Code with syntax errors can't be formatted: the error and its line are shown."],
  }),
  dev({
    id: "sql-formatter", name: "SQL Formatter", icon: "database",
    description: "Format SQL queries for MySQL, PostgreSQL, SQL Server, SQLite and more.",
    seo: "Format and beautify SQL queries for MySQL, PostgreSQL, SQL Server, SQLite and other dialects. Free and private.",
    keywords: ["sql formatter", "sql beautifier", "format sql", "pretty print sql", "mysql formatter", "postgresql formatter"],
    related: ["json-formatter", "javascript-formatter"], output: ["sql"], engine: "sql-formatter",
    limitations: ["Formats the text only: queries are never run. Unusual vendor syntax may not format perfectly."],
  }),
  dev({
    id: "yaml-formatter", name: "YAML Formatter", icon: "file-code",
    description: "Check and reformat YAML with consistent indentation, keeping comments.",
    seo: "Validate and format YAML with consistent indentation, keeping your comments. Runs in your browser: free and private.",
    keywords: ["yaml formatter", "yaml validator", "format yaml", "yaml lint", "yaml beautifier"],
    related: ["yaml-to-json", "json-to-yaml", "json-formatter"], output: ["yaml"], engine: "yaml",
    limitations: ["Anchors and aliases are kept. Documents with more than 100 aliases are refused, which stops “billion laughs” attacks."],
  }),
  dev({
    id: "base64-encoder-decoder", name: "Base64 Encoder and Decoder", icon: "binary", popular: true,
    description: "Encode text to Base64 or decode Base64 back to text, with full Unicode support.",
    seo: "Encode text to Base64 or decode Base64 to text, with UTF-8 and URL-safe support. Runs in your browser, so it stays private.",
    keywords: ["base64 encode", "base64 decode", "base64 converter", "base64 to text", "text to base64", "base64url"],
    related: ["url-encoder-decoder", "image-to-base64", "hash-generator"],
    limitations: ["Text is encoded as UTF-8. Base64 that decodes to binary data (such as an image) is reported instead of shown as garbled text."],
  }),
  dev({
    id: "url-encoder-decoder", name: "URL Encoder and Decoder", icon: "link",
    description: "Percent-encode text for URLs, or decode encoded URLs.",
    seo: "Percent-encode or decode URLs and query strings in your browser. Handles Unicode and + as a space. Free and private.",
    keywords: ["url encode", "url decode", "percent encoding", "urlencode", "uri encode", "query string decoder"],
    related: ["base64-encoder-decoder", "html-entity-encoder-decoder", "slug-generator"],
  }),
  dev({
    id: "html-entity-encoder-decoder", name: "HTML Entity Encoder and Decoder", icon: "code",
    description: "Escape special characters as HTML entities, or turn entities back into text.",
    seo: "Encode characters like < > & as HTML entities or decode entities back to text. Runs in your browser: free and private.",
    keywords: ["html entities", "html encode", "html decode", "html escape", "unescape html", "html special characters"],
    related: ["url-encoder-decoder", "html-formatter", "base64-encoder-decoder"],
    limitations: ["Decoding supports numeric entities and the common named ones (&amp;, &copy;, &nbsp;…). The text is never parsed as HTML."],
  }),
  dev({
    id: "jwt-decoder", name: "JWT Decoder", icon: "key-round",
    description: "Read the header and payload of a JSON Web Token. Does not verify the signature.",
    seo: "Decode a JSON Web Token's header and payload and see its expiry, privately in your browser. Signatures are not verified.",
    keywords: ["jwt decoder", "decode jwt", "jwt parser", "json web token", "jwt viewer", "bearer token decode"],
    related: ["base64-encoder-decoder", "unix-timestamp-converter", "json-formatter"], output: [],
    limitations: [
      "This decodes only. It does NOT check the signature, so it can't tell you whether a token is genuine or has been changed.",
      "Encrypted tokens (JWE) can't be read without the key.",
      sensitive,
    ],
    faqs: [{ q: "Does this verify the token?", a: "No. Anyone can create a token with any contents. Only your server, with the right key, can verify the signature. Use this tool to read a token, never to trust it." }],
  }),
  dev({
    id: "uuid-generator", name: "UUID Generator", icon: "hash",
    description: "Generate random version 4 or time-ordered version 7 UUIDs in bulk.",
    seo: "Generate UUID v4 and v7 identifiers in bulk with your browser's secure random generator. Free, instant and private.",
    keywords: ["uuid generator", "guid generator", "uuid v4", "uuid v7", "random uuid", "generate guid"],
    related: ["random-string-generator", "password-generator", "hash-generator"], engine: "Web Crypto (crypto.randomUUID, getRandomValues)",
    steps: ["Choose the version and how many you need.", "Copy or download the list.", "Select Generate again for new ones."],
  }),
  dev({
    id: "password-generator", name: "Password Generator", icon: "key", popular: true,
    description: "Create strong random passwords with your browser's secure random generator.",
    seo: "Generate strong, random passwords with Web Crypto in your browser. Choose the length and characters. Never stored or sent.",
    keywords: ["password generator", "strong password", "random password", "secure password generator", "passphrase"],
    related: ["random-string-generator", "uuid-generator", "hash-generator"], engine: "Web Crypto (crypto.getRandomValues)", output: [],
    steps: ["Choose the length and character types.", "Copy the password into your password manager.", "Select Generate again for a new one."],
    limitations: ["Each password includes at least one character of every type you choose. The strength shown is the randomness in bits, assuming an attacker knows the settings."],
    faqs: [{ q: "Is it really random?", a: "Yes. It uses crypto.getRandomValues, the browser's cryptographically secure generator, with no bias between characters. Math.random is never used." }],
  }),
  dev({
    id: "random-string-generator", name: "Random String Generator", icon: "shuffle",
    description: "Generate random strings of letters, numbers, hex or your own characters.",
    seo: "Generate secure random strings, tokens and codes from letters, numbers, hex or your own characters. Private, in your browser.",
    keywords: ["random string generator", "random text", "token generator", "random code generator", "random hex"],
    related: ["password-generator", "uuid-generator", "lorem-ipsum-generator"], engine: "Web Crypto (crypto.getRandomValues)",
    steps: ["Choose the length, how many, and which characters.", "Copy or download the list.", "Select Generate again for new ones."],
  }),
  dev({
    id: "hash-generator", name: "Hash Generator", icon: "hash",
    description: "Calculate MD5, SHA-1, SHA-256, SHA-512, SHA-3 and CRC32 hashes of text.",
    seo: "Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA-3 and CRC32 hashes of text in your browser. Free and private.",
    keywords: ["hash generator", "sha256 generator", "md5 generator", "sha512", "sha1", "checksum text", "sha3"],
    related: ["file-checksum-generator", "base64-encoder-decoder", "password-generator"], engine: "hash-wasm (WebAssembly)", output: [],
    limitations: ["Hashes the text's UTF-8 bytes. MD5, SHA-1 and CRC32 are broken for security uses. To hash a file, use the File Checksum Generator."],
  }),
  dev({
    id: "qr-code-generator", name: "QR Code Generator", icon: "qr-code", popular: true,
    description: "Make a QR code from any text or link, and download it as PNG or SVG.",
    seo: "Create QR codes for links and text, choose colours and error correction, and download PNG or SVG. Free, private, no sign-up.",
    keywords: ["qr code generator", "create qr code", "qr code maker", "url to qr code", "free qr code", "qr svg"],
    related: ["qr-code-reader", "url-encoder-decoder"], engine: "uqr", output: ["png", "svg"],
    steps: ["Enter the text or link.", "Pick colours and error correction if you like.", "Download PNG or SVG, and test it with your phone."],
    limitations: ["Codes are static: the content can't be changed later, and there's no scan tracking. Low-contrast colours may not scan."],
  }),
  dev({
    id: "qr-code-reader", name: "QR Code Reader", icon: "scan-line",
    description: "Read the content of a QR code from a photo or screenshot.",
    seo: "Scan a QR code from an image or screenshot in your browser and copy its text or link. Private: the image is never uploaded.",
    keywords: ["qr code reader", "scan qr code", "qr code scanner", "read qr from image", "decode qr code"],
    related: ["qr-code-generator", "image-cropper"], engine: "jsQR", input: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"], output: [], maxMB: 50,
    steps: ["Choose a photo or screenshot with a QR code.", "The content appears below.", "Copy it, and check any link before opening it."],
    limitations: ["Reads one QR code per image. Blurry, tiny or partly hidden codes may not be found: crop closer to the code. It doesn't use the camera."],
    faqs: [fileFaq],
  }),
  dev({
    id: "slug-generator", name: "Slug Generator", icon: "link-2",
    description: "Turn titles into clean, URL-friendly slugs.",
    seo: "Convert titles and text into clean URL slugs, removing accents and symbols. Batch one per line. Free and private.",
    keywords: ["slug generator", "url slug", "slugify", "seo friendly url", "permalink generator"],
    related: ["url-encoder-decoder", "text-case-converter", "remove-extra-spaces"],
    limitations: ["Accents are removed (é → e). Letters from non-Latin scripts are kept as they are."],
  }),
  dev({
    id: "cron-expression-generator", name: "Cron Expression Generator", icon: "clock",
    description: "Build a cron schedule, read it in plain English and see the next run times.",
    seo: "Build and explain cron expressions in plain English and preview the next run times. Free, private, in your browser.",
    keywords: ["cron generator", "cron expression", "crontab generator", "cron schedule", "cron explained", "crontab guru"],
    related: ["unix-timestamp-converter", "date-format-converter"], engine: "cronstrue and our own cron parser", output: [],
    limitations: ["Standard 5-field cron (minute hour day month weekday) plus @daily-style shortcuts. Seconds, years and Quartz extensions (L, W, #, ?) aren't supported."],
  }),
  dev({
    id: "json-to-csv", name: "JSON to CSV", icon: "sheet",
    description: "Convert a JSON array of objects into a CSV spreadsheet.",
    seo: "Convert JSON arrays to CSV for Excel and Google Sheets. Nested objects become columns. Free and private, in your browser.",
    keywords: ["json to csv", "convert json to csv", "json to excel", "json to spreadsheet"],
    related: ["csv-to-json", "json-formatter", "json-to-yaml"], engine: "Papa Parse", output: ["csv"],
    limitations: ["Nested objects become dotted columns (address.city). Arrays are written as JSON text. Values starting with = + - @ get a ' so spreadsheets don't run them as formulas."],
  }),
  dev({
    id: "csv-to-json", name: "CSV to JSON", icon: "table",
    description: "Convert CSV data into a JSON array.",
    seo: "Convert CSV to JSON with header detection and number conversion. Runs in your browser: your data stays private.",
    keywords: ["csv to json", "convert csv to json", "csv parser", "excel to json"],
    related: ["json-to-csv", "json-formatter"], engine: "Papa Parse", output: ["json"],
  }),
  dev({
    id: "json-to-yaml", name: "JSON to YAML", icon: "file-code",
    description: "Convert JSON into YAML.",
    seo: "Convert JSON to clean, readable YAML in your browser. Free, private, nothing uploaded.",
    keywords: ["json to yaml", "convert json to yaml", "json yaml converter"],
    related: ["yaml-to-json", "yaml-formatter", "json-formatter"], engine: "yaml", output: ["yaml"],
  }),
  dev({
    id: "yaml-to-json", name: "YAML to JSON", icon: "braces",
    description: "Convert YAML into JSON.",
    seo: "Convert YAML to JSON in your browser, including multi-document files. Free and private.",
    keywords: ["yaml to json", "convert yaml to json", "yaml parser", "yml to json"],
    related: ["json-to-yaml", "yaml-formatter", "json-formatter"], engine: "yaml", output: ["json"],
    limitations: ["Several YAML documents become a JSON array. YAML-only types (dates, binary) become text."],
  }),
  dev({
    id: "json-to-xml", name: "JSON to XML", icon: "file-code",
    description: "Convert JSON into XML elements and attributes.",
    seo: "Convert JSON to XML in your browser. Keys starting with @ become attributes. Free, private and nothing is uploaded.",
    keywords: ["json to xml", "convert json to xml", "json xml converter"],
    related: ["xml-to-json", "xml-formatter", "json-formatter"], output: ["xml"],
    limitations: ["Keys starting with @ become attributes and #text becomes text. Names that aren't valid in XML are adjusted (spaces become _)."],
  }),
  dev({
    id: "xml-to-json", name: "XML to JSON", icon: "braces",
    description: "Convert XML into JSON.",
    seo: "Convert XML to JSON in your browser. Attributes become @keys and repeated elements become arrays. Free and private.",
    keywords: ["xml to json", "convert xml to json", "xml parser", "xml json converter"],
    related: ["json-to-xml", "xml-formatter", "json-formatter"], engine: "Browser DOMParser (no external entities are loaded)", output: ["json"],
    limitations: ["Attributes become @keys, text next to elements becomes #text, and all values are text. Comments and processing instructions are dropped."],
  }),
  dev({
    id: "regex-tester", name: "Regex Tester", icon: "regex",
    description: "Test regular expressions, highlight matches, see groups, and try replacements.",
    seo: "Test JavaScript regular expressions with live match highlighting, groups and replace. Runs safely in your browser.",
    keywords: ["regex tester", "regular expression tester", "regex online", "test regex", "regex replace", "regexp"],
    related: ["find-and-replace", "text-diff-checker"], engine: "JavaScript RegExp in a Web Worker", mode: "web-worker", output: [],
    limitations: ["JavaScript regex syntax. Patterns run in a separate thread and stop after 2 seconds, so a runaway pattern can't freeze the page. The first 5,000 matches are listed."],
  }),
  dev({
    id: "unix-timestamp-converter", name: "Unix Timestamp Converter", icon: "clock",
    description: "Convert Unix timestamps to dates, and dates to timestamps.",
    seo: "Convert Unix epoch timestamps in seconds or milliseconds to readable dates in any time zone, and back. Free and private.",
    keywords: ["unix timestamp", "epoch converter", "timestamp to date", "date to timestamp", "epoch time", "unix time"],
    related: ["date-format-converter", "cron-expression-generator", "jwt-decoder"], engine: "Browser Date and Intl", output: [],
    limitations: ["Numbers under 100 billion are read as seconds, larger ones as milliseconds, unless you choose. Leap seconds aren't counted, as in Unix time itself."],
  }),
  dev({
    id: "date-format-converter", name: "Date Format Converter", icon: "calendar",
    description: "Show a date in ISO 8601, RFC 2822, Unix time and other formats, in any time zone.",
    seo: "Convert dates between ISO 8601, RFC 2822, Unix timestamps and local formats in any time zone. Free and private.",
    keywords: ["date format converter", "iso 8601 converter", "rfc 2822", "date converter", "time zone converter", "convert date format"],
    related: ["unix-timestamp-converter", "date-calculator"], engine: "Browser Date and Intl", output: [],
    limitations: ["Ambiguous forms like 01/02/2026 aren't accepted, because they mean different dates in different countries. Use 2026-02-01."],
  }),
  dev({
    id: "markdown-preview", name: "Markdown Preview", icon: "eye",
    description: "See Markdown rendered as a web page, and get the HTML.",
    seo: "Preview Markdown as formatted text and copy the sanitised HTML. Safe and private: nothing is uploaded or loaded.",
    keywords: ["markdown preview", "markdown viewer", "markdown to html", "md preview", "render markdown"],
    related: ["markdown-editor", "html-formatter", "word-counter"], engine: "marked and DOMPurify", output: ["html"],
    limitations: ["GitHub-flavoured Markdown. Scripts, styles, forms and frames are removed. Images from websites aren't loaded (that would reveal your visit); embedded data images are shown."],
  }),
  dev({
    id: "colour-converter", name: "Colour Converter", icon: "palette",
    description: "Convert colours between HEX, RGB, HSL, HSV and CMYK, and check contrast.",
    seo: "Convert colours between HEX, RGB, HSL, HSV and CMYK with a colour picker and contrast ratios. Free and private.",
    keywords: ["color converter", "colour converter", "hex to hsl", "rgb to hsl", "color picker", "cmyk converter"],
    related: ["hex-to-rgb", "rgb-to-hex", "image-colour-picker"], output: [],
    limitations: ["sRGB colours. CMYK is a simple conversion without a printer profile, so print colours will differ."],
  }),
  dev({
    id: "hex-to-rgb", name: "HEX to RGB", icon: "palette",
    description: "Convert a HEX colour code to RGB, HSL and more.",
    seo: "Convert HEX colour codes like #ff8800 to RGB, HSL, HSV and CMYK values instantly in your browser. Free and private.",
    keywords: ["hex to rgb", "hex color to rgb", "convert hex to rgb", "html color to rgb"],
    related: ["rgb-to-hex", "colour-converter"], output: [],
  }),
  dev({
    id: "rgb-to-hex", name: "RGB to HEX", icon: "palette",
    description: "Convert RGB colour values to a HEX code and more.",
    seo: "Convert RGB colour values like rgb(255, 136, 0) to HEX codes, HSL and more, instantly in your browser. Free and private.",
    keywords: ["rgb to hex", "rgb color to hex", "convert rgb to hex", "rgba to hex"],
    related: ["hex-to-rgb", "colour-converter"], output: [],
  }),
  dev({
    id: "css-gradient-generator", name: "CSS Gradient Generator", icon: "blend",
    description: "Design linear, radial and conic CSS gradients and copy the code.",
    seo: "Create linear, radial and conic CSS gradients with a live preview and copy the CSS. Free, private, in your browser.",
    keywords: ["css gradient generator", "gradient maker", "linear gradient", "radial gradient", "background gradient css"],
    related: ["css-shadow-generator", "colour-converter", "css-formatter"], output: ["css"],
    steps: ["Pick the type, angle and colours.", "Check the preview.", "Copy the CSS."],
  }),
  dev({
    id: "css-shadow-generator", name: "CSS Shadow Generator", icon: "square-stack",
    description: "Design box shadows with a live preview and copy the CSS.",
    seo: "Create CSS box shadows with sliders and a live preview, then copy the code. Free, private and runs in your browser.",
    keywords: ["css shadow generator", "box shadow generator", "box-shadow css", "shadow maker"],
    related: ["css-gradient-generator", "colour-converter", "css-formatter"], output: ["css"],
    steps: ["Move the sliders and pick a colour.", "Check the preview.", "Copy the CSS."],
  }),
];

const counter = (id: string, name: string, what: string, extra: string[]): Spec => ({
  id, name, icon: "whole-word",
  description: `Count the ${what} in your text, plus words, characters, sentences and reading time.`,
  seo: `Count ${what} in any text instantly, with words, characters, sentences, paragraphs and reading time. Free and private.`,
  keywords: [`${what} counter`, `count ${what}`, `${what} count`, ...extra],
  related: ["word-counter", "character-counter", "reading-time-calculator"].filter((r) => r !== id),
  output: [],
  limitations: ["Words and sentences are found with the browser's language rules, so counts can differ slightly from Word or Google Docs."],
});

const caseSpec = (id: string, name: string, what: string, icon: IconKey, keywords: string[]): Spec => ({
  id, name, icon,
  description: `Convert text to ${what}.`,
  seo: `Convert any text to ${what} instantly in your browser. Copy or download the result. Free, private, no sign-up.`,
  keywords,
  related: ["text-case-converter", "uppercase-converter", "lowercase-converter", "title-case-converter"].filter((r) => r !== id).slice(0, 3),
});

export const textTools = (): ToolDefinition[] => [
  text({ ...counter("word-counter", "Word Counter", "words", ["word count", "how many words", "essay word counter"]), popular: true }),
  text(counter("character-counter", "Character Counter", "characters", ["letter counter", "character count", "chars counter", "character limit"])),
  text(counter("sentence-counter", "Sentence Counter", "sentences", ["how many sentences"])),
  text(counter("paragraph-counter", "Paragraph Counter", "paragraphs", ["how many paragraphs"])),
  text({
    ...caseSpec("text-case-converter", "Text Case Converter", "upper, lower, title, sentence, camel, snake or kebab case", "case-sensitive", [
      "case converter", "change case", "text case", "camelcase converter", "snake case converter", "kebab case",
    ]),
    popular: true,
    limitations: ["Title Case keeps short words (a, an, the, of…) lowercase except at the start and end, a common style. Check names and acronyms afterwards."],
  }),
  text(caseSpec("uppercase-converter", "Uppercase Converter", "UPPERCASE", "case-upper", ["uppercase converter", "to upper case", "all caps converter", "capitalize all"])),
  text(caseSpec("lowercase-converter", "Lowercase Converter", "lowercase", "case-lower", ["lowercase converter", "to lower case", "remove caps"])),
  text({
    ...caseSpec("title-case-converter", "Title Case Converter", "Title Case", "case-sensitive", ["title case converter", "headline case", "capitalize titles"]),
    limitations: ["Short words (a, an, the, of, in…) stay lowercase except at the start and end. Check names and acronyms afterwards."],
  }),
  text({
    id: "remove-duplicate-lines", name: "Remove Duplicate Lines", icon: "list-x",
    description: "Delete repeated lines from a list, keeping the first copy of each.",
    seo: "Remove duplicate lines from lists and text, with options to ignore case and spaces. Free and private, in your browser.",
    keywords: ["remove duplicate lines", "dedupe list", "unique lines", "delete duplicates", "remove duplicates from list"],
    related: ["sort-text-lines", "remove-empty-lines", "text-cleaner"],
  }),
  text({
    id: "sort-text-lines", name: "Sort Text Lines", icon: "arrow-up-az",
    description: "Sort lines alphabetically, naturally, by number or length, or shuffle them.",
    seo: "Sort lines of text A–Z, Z–A, naturally, by number or by length, or shuffle them. Free and private, in your browser.",
    keywords: ["sort lines", "alphabetize list", "sort text", "sort alphabetically", "shuffle lines"],
    related: ["remove-duplicate-lines", "reverse-text", "remove-empty-lines"],
    limitations: ["Alphabetical order follows your browser's language rules. Shuffle uses an ordinary random generator, not a secure one."],
  }),
  text({
    id: "reverse-text", name: "Reverse Text", icon: "arrow-left-right",
    description: "Reverse the characters, the words in each line, or the order of lines.",
    seo: "Reverse text backwards by characters, words or lines. Emoji and accented letters stay intact. Free and private.",
    keywords: ["reverse text", "backwards text", "reverse string", "flip text", "reverse words"],
    related: ["sort-text-lines", "text-case-converter"],
  }),
  text({
    id: "remove-extra-spaces", name: "Remove Extra Spaces", icon: "text-quote",
    description: "Collapse repeated spaces and trim the ends of lines.",
    seo: "Remove extra spaces, tabs and trailing whitespace from text, keeping line breaks if you want. Free and private.",
    keywords: ["remove extra spaces", "remove double spaces", "trim whitespace", "collapse spaces"],
    related: ["remove-empty-lines", "text-cleaner", "remove-duplicate-lines"],
  }),
  text({
    id: "remove-empty-lines", name: "Remove Empty Lines", icon: "list-minus",
    description: "Delete blank lines from text.",
    seo: "Remove empty and whitespace-only lines from text in one click. Free, private and runs in your browser.",
    keywords: ["remove empty lines", "remove blank lines", "delete empty lines"],
    related: ["remove-extra-spaces", "remove-duplicate-lines", "text-cleaner"],
  }),
  text({
    id: "find-and-replace", name: "Find and Replace", icon: "replace",
    description: "Find and replace words or patterns in text, with optional regular expressions.",
    seo: "Find and replace text with case, whole-word and regular-expression options. Runs privately in your browser.",
    keywords: ["find and replace", "replace text", "search and replace", "bulk replace", "regex replace"],
    related: ["regex-tester", "text-cleaner", "text-diff-checker"],
    limitations: ["Regular expressions use JavaScript syntax, run in a separate thread and stop after 2 seconds."],
  }),
  text({
    id: "text-cleaner", name: "Text Cleaner", icon: "sparkles",
    description: "Strip invisible characters, curly quotes, extra spaces and HTML tags from text.",
    seo: "Clean pasted text: remove invisible characters, smart quotes, extra spaces, blank lines and HTML tags. Free and private.",
    keywords: ["text cleaner", "clean text", "remove invisible characters", "zero width space remover", "plain text converter", "remove formatting"],
    related: ["remove-extra-spaces", "remove-empty-lines", "find-and-replace"],
    limitations: ["Removing HTML tags is simple text matching: it isn't a way to make untrusted HTML safe."],
  }),
  text({
    id: "text-diff-checker", name: "Text Diff Checker", icon: "diff", popular: true,
    description: "Compare two texts and highlight what was added and removed.",
    seo: "Compare two texts side by side and highlight differences by line, word or character. Free and private, in your browser.",
    keywords: ["diff checker", "text compare", "compare text", "difference checker", "diff tool", "compare two texts"],
    related: ["find-and-replace", "text-cleaner"], engine: "jsdiff", output: ["diff"],
    limitations: ["Up to 500,000 characters in total. Comparing very different texts by character can be slow."],
  }),
  text({
    id: "reading-time-calculator", name: "Reading Time Calculator", icon: "timer",
    description: "Estimate how long a text takes to read or to say aloud.",
    seo: "Estimate reading and speaking time for any text, with adjustable words per minute. Free and private.",
    keywords: ["reading time calculator", "how long to read", "speech time calculator", "words per minute"],
    related: ["word-counter", "character-counter"], output: [],
  }),
  text({
    id: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", icon: "pilcrow",
    description: "Generate placeholder paragraphs, sentences or words.",
    seo: "Generate lorem ipsum placeholder text by paragraphs, sentences or words for designs and mockups. Free and instant.",
    keywords: ["lorem ipsum", "placeholder text", "dummy text", "filler text generator"],
    related: ["random-string-generator", "word-counter"],
    steps: ["Choose how many paragraphs, sentences or words.", "Copy or download the text.", "Select Generate again for different text."],
  }),
  text({
    id: "markdown-editor", name: "Markdown Editor", icon: "notebook-pen",
    description: "Write Markdown with a live preview, then download it as Markdown or HTML.",
    seo: "Write Markdown with a live, sanitised preview and download .md or .html files. Private: nothing is uploaded or saved.",
    keywords: ["markdown editor", "online markdown editor", "md editor", "markdown to html", "write markdown"],
    related: ["markdown-preview", "word-counter", "html-formatter"], engine: "marked and DOMPurify", output: ["md", "html"],
    limitations: [
      "Nothing is saved: download your work before leaving or reloading the page.",
      "Scripts, styles, forms and frames are removed from the preview. Images from websites aren't loaded.",
    ],
  }),
];

export const productivityTools = (): ToolDefinition[] => [
  calc({
    id: "unit-converter", name: "Unit Converter", icon: "ruler", popular: true,
    description: "Convert length, weight, temperature, volume, area, speed and time.",
    seo: "Convert units of length, weight, temperature, volume, area, speed and time using exact definitions. Free and private.",
    keywords: ["unit converter", "metric converter", "cm to inches", "kg to lbs", "celsius to fahrenheit", "convert units"],
    related: ["file-size-converter", "percentage-calculator"],
  }),
  calc({
    id: "percentage-calculator", name: "Percentage Calculator", icon: "percent", popular: true,
    description: "Work out percentages, percentage change, and increases or decreases.",
    seo: "Calculate X% of Y, what percent one number is of another, percentage change, and increases or decreases. Free.",
    keywords: ["percentage calculator", "percent calculator", "percentage change", "percent increase", "what percent"],
    related: ["discount-calculator", "tip-calculator"],
  }),
  calc({
    id: "date-calculator", name: "Date Calculator", icon: "calendar-range",
    description: "Count the days between two dates, or add days, weeks, months or years to a date.",
    seo: "Count days, weeks and weekdays between dates, or add and subtract days, months and years. Free and private.",
    keywords: ["date calculator", "days between dates", "date difference", "add days to date", "business days calculator"],
    related: ["age-calculator", "time-duration-calculator", "date-format-converter"],
  }),
  calc({
    id: "age-calculator", name: "Age Calculator", icon: "cake",
    description: "Find an exact age in years, months and days, and the next birthday.",
    seo: "Calculate exact age in years, months, days, weeks and days, and how long until the next birthday. Free and private.",
    keywords: ["age calculator", "how old am i", "calculate age", "birthday calculator", "date of birth calculator"],
    related: ["date-calculator", "time-duration-calculator"],
  }),
  calc({
    id: "time-duration-calculator", name: "Time Duration Calculator", icon: "hourglass",
    description: "Work out the hours between two times, minus breaks, including overnight shifts.",
    seo: "Calculate hours and minutes between two times, minus breaks, including overnight shifts. Shown in decimal hours too.",
    keywords: ["time duration calculator", "hours calculator", "time between", "work hours calculator", "shift calculator"],
    related: ["date-calculator", "age-calculator", "unit-converter"],
  }),
  calc({
    id: "loan-calculator", name: "Loan Calculator", icon: "landmark",
    description: "Estimate loan or mortgage payments, total interest and the balance each year.",
    seo: "Estimate monthly loan and mortgage payments, total interest and a yearly balance table. Private: nothing is sent.",
    keywords: ["loan calculator", "mortgage calculator", "monthly payment calculator", "amortization", "interest calculator"],
    related: ["percentage-calculator", "discount-calculator"],
    limitations: ["Assumes a fixed rate and equal payments, with no fees, insurance or taxes. Your lender's figures may differ."],
  }),
  calc({
    id: "bmi-calculator", name: "BMI Calculator", icon: "heart-pulse",
    description: "Calculate adult body mass index in metric or imperial units.",
    seo: "Calculate your adult BMI in kilograms and centimetres or pounds, feet and inches. Private: nothing you enter is sent.",
    keywords: ["bmi calculator", "body mass index", "calculate bmi", "bmi chart", "healthy weight"],
    related: ["unit-converter", "age-calculator"],
    limitations: ["For adults only. BMI is a rough screening measure, not a diagnosis, and doesn't account for muscle, age, sex or ethnicity."],
  }),
  calc({
    id: "tip-calculator", name: "Tip Calculator", icon: "hand-coins",
    description: "Work out the tip and split the bill between people.",
    seo: "Calculate the tip and split the bill between any number of people, with optional rounding up. Free and instant.",
    keywords: ["tip calculator", "split bill", "gratuity calculator", "bill splitter"],
    related: ["percentage-calculator", "discount-calculator"],
  }),
  calc({
    id: "discount-calculator", name: "Discount Calculator", icon: "tag",
    description: "Find the sale price and savings, including stacked discounts and tax.",
    seo: "Calculate the sale price and how much you save, including a second stacked discount and sales tax. Free and instant.",
    keywords: ["discount calculator", "sale price calculator", "percent off", "price after discount"],
    related: ["percentage-calculator", "tip-calculator"],
  }),
  calc({
    id: "file-size-converter", name: "File Size Converter", icon: "hard-drive",
    description: "Convert between bytes, KB, MB, GB, TB and their binary KiB, MiB and GiB versions.",
    seo: "Convert file sizes between bytes, KB, MB, GB and TB, binary KiB, MiB and GiB, and bits. Free and instant.",
    keywords: ["file size converter", "mb to gb", "bytes converter", "kb to mb", "gib to gb", "data size converter"],
    related: ["unit-converter", "zip-file-creator"],
  }),
];

export const fileTools = (): ToolDefinition[] => [
  file({
    id: "zip-file-creator", name: "ZIP File Creator", icon: "file-archive",
    description: "Put several files into one ZIP archive.",
    seo: "Create a ZIP file from several files in your browser. Choose the compression. Private: files are never uploaded.",
    keywords: ["zip files", "create zip", "compress files", "zip maker", "make zip online"],
    related: ["zip-file-extractor", "file-checksum-generator"], output: ["zip"], maxMB: 2048, mode: "main-thread",
    steps: ["Choose or drop your files.", "Pick the compression level and a name.", "Select Create ZIP, then download it."],
    limitations: [
      "Up to 2 GB of files in total. The ZIP is built in your browser's memory, so phones may manage less.",
      "Files with the same name get -2, -3… added. Folders and passwords aren't supported.",
    ],
  }),
  file({
    id: "zip-file-extractor", name: "ZIP File Extractor", icon: "folder",
    description: "Open a ZIP file and download the files inside it.",
    seo: "Open ZIP files in your browser and download the files inside, with protection against zip bombs. Private: no upload.",
    keywords: ["unzip", "zip extractor", "open zip file", "extract zip online", "unzip files"],
    related: ["zip-file-creator", "file-checksum-generator"], input: ["zip"], maxMB: 1024,
    steps: ["Choose a ZIP file.", "See the list of files inside.", "Download the ones you need."],
    limitations: [
      "Up to 10,000 files and 4 GB unpacked, 1 GB per file. Files that compress suspiciously well, or unpack bigger than the archive says, are stopped (zip bomb protection).",
      "Password-protected archives and compression other than Store and Deflate (such as ZIPX or 7z methods) aren't supported. Archives inside the archive aren't opened.",
    ],
    faqs: [{ q: "What's a zip bomb?", a: "A small archive built to unpack into an enormous amount of data and crash the computer. This tool checks the sizes before unpacking and counts the real output while unpacking, and stops anything over the limits." }],
  }),
  file({
    id: "file-checksum-generator", name: "File Checksum Generator", icon: "shield-check",
    description: "Calculate SHA-256, MD5 and other checksums of a file and compare them.",
    seo: "Calculate SHA-256, SHA-512, SHA-1, MD5 and CRC32 checksums of any file and compare with the expected value. Private.",
    keywords: ["checksum", "sha256 checksum", "md5 checksum", "file hash", "verify download", "hash file"],
    related: ["hash-generator", "zip-file-extractor"], output: [], maxMB: 10240, mode: "main-thread",
    steps: ["Choose a file.", "Pick the algorithms, and paste the expected checksum if you have one.", "Select Calculate checksums."],
    limitations: ["The file is read in small chunks, so even large files work, but hashing gigabytes takes a while. MD5, SHA-1 and CRC32 only detect accidental damage, not tampering."],
  }),
];
