import { strToU8, zipSync } from "fflate";
import { downloadResult, expect, file, open, test, unzip, type Page } from "./fixtures";

// Developer, text, productivity and file tools. Every typed-input tool is
// driven through its page: fill the inputs, check the live result. The guard
// fixture fails a test that sends anything anywhere or stores anything.

type Case = { fill?: [label: string, value: string][]; expect: (string | RegExp)[] };

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const jwt = `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url('{"sub":"123","name":"Ann","exp":1700000000}')}.c2lnbmF0dXJl`;

const cases: Record<string, Case> = {
  // Developer
  "json-formatter": { fill: [["JSON", '{"b":1,"a":[1,2]}']], expect: ['{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}'] },
  "json-validator": { fill: [["JSON", '{"a":{"b":[1]}}']], expect: ["Valid JSON.", /Nesting depth\s*3/] },
  "json-minifier": { fill: [["JSON", '{ "a": 1,\n  "b": [1, 2] }']], expect: ['{"a":1,"b":[1,2]}'] },
  "xml-formatter": { fill: [["XML", "<a><b>1</b><!-- c --></a>"]], expect: ["<a>\n  <b>1</b>\n  <!-- c -->\n</a>"] },
  "html-formatter": { fill: [["HTML", "<div><p>Hello</p><ul><li>One</li></ul></div>"]], expect: ["<p>Hello</p>", "    <li>One</li>"] },
  "css-formatter": { fill: [["CSS", ".a{color:red;margin:0}"]], expect: [".a {\n  color: red;\n  margin: 0;\n}"] },
  "javascript-formatter": { fill: [["JavaScript", "function add(a,b){return a+b}"]], expect: ["function add(a, b) {\n  return a + b;\n}"] },
  "sql-formatter": { fill: [["SQL", "select id, name from users where active = 1"]], expect: ["SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  active = 1"] },
  "yaml-formatter": { fill: [["YAML", "# keep\na:   1\nb: [1, 2]"]], expect: ["# keep\na: 1\nb: [ 1, 2 ]"] },
  "base64-encoder-decoder": { fill: [["Text", "héllo 👍"]], expect: ["aMOpbGxvIPCfkY0="] },
  "url-encoder-decoder": { fill: [["Text", "a b&c=é"]], expect: ["a%20b%26c%3D%C3%A9"] },
  "html-entity-encoder-decoder": { fill: [["Text", `<a href="x">&`]], expect: ["&lt;a href=&quot;x&quot;&gt;&amp;"] },
  "jwt-decoder": { fill: [["JWT", jwt]], expect: ['"name": "Ann"', '"alg": "HS256"', /signature has NOT been checked/] },
  "uuid-generator": { expect: [/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/] },
  "password-generator": { expect: [/bits/i] },
  "random-string-generator": { expect: [/[A-Za-z0-9]{16}/] },
  "hash-generator": {
    fill: [["Text", "abc"]],
    expect: ["ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "900150983cd24fb0d6963f7d28e17f72", "352441c2"],
  },
  "qr-code-generator": { fill: [["Text or link", "https://example.com"]], expect: [/Version 2, 25 × 25 modules/] },
  "slug-generator": { fill: [["Text (one slug per line)", "Crème Brûlée Recipe — Easy & Quick!"]], expect: ["creme-brulee-recipe-easy-and-quick"] },
  "cron-expression-generator": { expect: ["0 9 * * 1-5", /Monday through Friday/] },
  "json-to-csv": { fill: [["JSON (an array of objects)", '[{"a":1,"b":{"c":"x"}},{"a":"=1+1"}]']], expect: ["a,b.c", "1,x", "'=1+1"] },
  "csv-to-json": { fill: [["CSV", "a,b\n1,x"]], expect: ['"a": 1', '"b": "x"'] },
  "json-to-yaml": { fill: [["JSON", '{"a":[1,2],"b":"x"}']], expect: ["a:\n  - 1\n  - 2\nb: x"] },
  "yaml-to-json": { fill: [["YAML", "a: 1\nb: [x, y]"]], expect: ['"a": 1', '"x"'] },
  "json-to-xml": { fill: [["JSON", '{"root":{"@id":"1","name":"Ann & Bo"}}']], expect: ['<root id="1">', "<name>Ann &amp; Bo</name>"] },
  "xml-to-json": { fill: [["XML", '<r id="1"><n>Ann</n><n>Bo</n></r>']], expect: ['"@id": "1"', '"n": [', '"Bo"'] },
  "regex-tester": { fill: [["Regular expression", "(\\d+)-(\\d+)"], ["Test text", "a 12-34 b 5-6"]], expect: ["12-34", "5-6"] },
  "unix-timestamp-converter": { fill: [["Unix timestamp", "1700000000"]], expect: ["2023-11-14T22:13:20.000Z"] },
  "date-format-converter": { fill: [["Date and time", "2026-01-02T03:04:05Z"]], expect: ["1767323045", "2026-01-02T03:04:05.000Z"] },
  "markdown-preview": { fill: [["Markdown", "# Hello\n\nSome **bold** text"]], expect: ["Hello", "<strong>bold</strong>"] },
  "colour-converter": { fill: [["Colour (HEX, RGB or HSL)", "#ff0000"]], expect: ["rgb(255, 0, 0)", "hsl(0, 100%, 50%)"] },
  "hex-to-rgb": { expect: ["rgb(255, 136, 0)"] },
  "rgb-to-hex": { expect: ["#ff8800"] },
  "css-gradient-generator": { expect: ["linear-gradient(90deg, #4f46e5, #06b6d4)"] },
  "css-shadow-generator": { expect: ["box-shadow: 0px 8px 24px -4px rgba(15, 23, 42, 0.25);"] },

  // Text
  "word-counter": { fill: [["Text", "One two three. Four five.\n\nSix."]], expect: ["6 words", /Sentences\s*3/, /Paragraphs\s*2/] },
  "character-counter": { fill: [["Text", "héllo 👍"]], expect: ["7 characters"] },
  "sentence-counter": { fill: [["Text", "Hi there. How are you? Fine!"]], expect: ["3 sentences"] },
  "paragraph-counter": { fill: [["Text", "One.\n\nTwo.\n\n\nThree."]], expect: ["3 paragraphs"] },
  "text-case-converter": { fill: [["Text", "the lord of the rings"]], expect: ["The Lord of the Rings"] },
  "uppercase-converter": { fill: [["Text", "straße"]], expect: ["STRASSE"] },
  "lowercase-converter": { fill: [["Text", "HELLO World"]], expect: ["hello world"] },
  "title-case-converter": { fill: [["Text", "a tale of two cities"]], expect: ["A Tale of Two Cities"] },
  "remove-duplicate-lines": { fill: [["Text (one item per line)", "a\nb\na\nc\nb"]], expect: ["a\nb\nc"] },
  "sort-text-lines": { fill: [["Text (one item per line)", "b\na10\na2"]], expect: ["a2\na10\nb"] },
  "reverse-text": { fill: [["Text", "abc 👍🏽"]], expect: ["👍🏽 cba"] },
  "remove-extra-spaces": { fill: [["Text", "a   b  \n  c"]], expect: ["a b\nc"] },
  "remove-empty-lines": { fill: [["Text", "a\n\n  \nb"]], expect: ["a\nb"] },
  "find-and-replace": { fill: [["Text", "cat Cat cat"], ["Find", "cat"], ["Replace with", "dog"]], expect: ["dog Cat dog"] },
  "text-cleaner": { fill: [["Text", "a\u200bb   c"]], expect: ["ab c"] },
  "text-diff-checker": { fill: [["Original text", "the cat sat"], ["Changed text", "the dog sat"]], expect: ["cat", "dog"] },
  "reading-time-calculator": { fill: [["Text", Array(476).fill("word").join(" ")]], expect: [/2 min/] },
  "lorem-ipsum-generator": { expect: [/^Lorem ipsum dolor sit amet/m] },
  "markdown-editor": { expect: ["My document", "Download HTML"] },

  // Productivity
  "unit-converter": { expect: ["1 m = 3.2808399 ft"] },
  "percentage-calculator": { expect: [/\b30\b/] },
  "date-calculator": { fill: [["Start date", "2026-01-01"], ["End date", "2026-12-25"]], expect: ["358 days"] },
  "age-calculator": { fill: [["Date of birth", "2000-02-29"], ["Age on", "2026-02-28"]], expect: ["26 years, 0 months, 0 days"] },
  "time-duration-calculator": { fill: [["Start time", "22:00"], ["End time", "06:30"], ["Break (minutes)", "30"]], expect: ["8 h 0 min"] },
  "loan-calculator": { expect: ["1,199.10", "231,676.38"] },
  "bmi-calculator": { fill: [["Weight", "70"], ["Height", "175"]], expect: ["22.9"] },
  "tip-calculator": { fill: [["Bill", "100"], ["People", "2"]], expect: ["115.00", "57.50"] },
  "discount-calculator": { fill: [["Original price", "100"], ["Extra discount (%)", "10"]], expect: ["72.00", "28.00"] },
  "file-size-converter": { expect: ["1,000,000,000", "0.931323"] },
};

/** Everything the result panel shows, including text box values. */
const resultText = (page: Page) =>
  page
    .getByRole("region", { name: "Result" })
    .evaluate((el) => [el.textContent ?? "", ...[...el.querySelectorAll("textarea")].map((t) => t.value), ...[...el.querySelectorAll("[data-html]")].map((t) => t.getAttribute("data-html") ?? "")].join("\n"));

async function fill(page: Page, fields: [string, string][] = []) {
  for (const [label, value] of fields) await page.getByLabel(label, { exact: true }).first().fill(value);
}

test.describe("typed-input tools", () => {
  for (const [slug, c] of Object.entries(cases)) {
    test(`${slug} works and keeps input out of the URL`, async ({ page }) => {
      await page.goto(`/${slug}/`);
      await fill(page, c.fill);
      for (const want of c.expect) await expect.poll(() => resultText(page), { timeout: 15_000 }).toMatch(typeof want === "string" ? new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : want);
      expect(new URL(page.url()).search + new URL(page.url()).hash).toBe("");
      await expect(page.getByText(/never uploaded|stays on your device|runs in your browser/i).first()).toBeVisible();
    });
  }
});

test("Reset clears the input", async ({ page }) => {
  await page.goto("/word-counter/");
  await fill(page, [["Text", "one two"]]);
  await expect.poll(() => resultText(page)).toMatch("2 words");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue("");
});

test("invalid input shows a clear message", async ({ page }) => {
  await page.goto("/json-validator/");
  await fill(page, [["JSON", '{"a":1,}']]);
  await expect(page.getByRole("alert").filter({ hasText: "Check your input" })).toBeVisible();
});

test("generators make new values on Generate again", async ({ page }) => {
  await page.goto("/uuid-generator/");
  await expect.poll(() => resultText(page)).toMatch(/[0-9a-f]{8}-/);
  const first = await resultText(page);
  await page.getByRole("button", { name: "Generate again" }).click();
  await expect.poll(() => resultText(page)).not.toBe(first);
});

test.describe("safety", () => {
  test("Markdown preview strips scripts and never loads remote images", async ({ page }) => {
    await page.goto("/markdown-preview/");
    await fill(page, [["Markdown", '# T\n\n![tracker](https://example.com/pixel.png)\n\n<img src=x onerror="window.__x=1"><script>window.__x=1</script>\n\n[a](javascript:alert(1))']]);
    await expect.poll(() => resultText(page)).toMatch("[Image not loaded: tracker]");
    expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();
    const result = page.getByRole("region", { name: "Result" });
    await expect(result.locator("script, img:not([src^='data:']), a[href^='javascript']")).toHaveCount(0);
  });

  test("XML external entities are never loaded", async ({ page }) => {
    await page.goto("/xml-to-json/");
    await fill(page, [["XML", '<!DOCTYPE r [<!ENTITY x SYSTEM "http://127.0.0.2/secret">]><r>&x;</r>']]);
    // Browsers either reject the DOCTYPE or leave the entity empty; none fetch it (the guard checks).
    await expect(page.getByRole("alert").or(page.getByRole("textbox", { name: "JSON" }))).toBeVisible();
    expect(await resultText(page)).not.toMatch(/secret|root:/);
  });

  test("a runaway regex is stopped and the page stays usable", async ({ page }) => {
    await page.goto("/regex-tester/");
    // The backreference keeps V8 off its linear-time fallback engine, so it really backtracks.
    await fill(page, [["Regular expression", "^(a+)+b\\1$"], ["Test text", `${"a".repeat(40)}!`]]);
    // Chromium hits our 2 s timeout. Firefox and WebKit engines may give up on their own and report no match.
    const stopped = page.getByRole("alert").filter({ hasText: "more than 2 seconds" });
    await expect(stopped.or(page.getByText(/^0 matches\./))).toBeVisible({ timeout: 10_000 });
    if (test.info().project.name === "chromium") await expect(stopped).toBeVisible();
    await fill(page, [["Regular expression", "a{3}"]]);
    await expect.poll(() => resultText(page)).toMatch("aaa");
  });

  test("passwords use every chosen character type", async ({ page }) => {
    await page.goto("/password-generator/");
    const out = page.getByRole("region", { name: "Result" }).locator("textarea").first();
    await expect(out).not.toHaveValue("");
    const pw = await out.inputValue();
    expect(pw).toHaveLength(20);
    for (const re of [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/]) expect(pw).toMatch(re);
  });
});

// ── File tools ───────────────────────────────────────────────────────────────

/** Overwrites the declared unpacked size of every entry (local and central headers). */
function lieAboutSize(zip: Uint8Array, size: number) {
  const out = zip.slice();
  const v = new DataView(out.buffer);
  for (let i = 0; i + 4 <= out.length; i++) {
    const sig = v.getUint32(i, true);
    if (sig === 0x04034b50) v.setUint32(i + 22, size, true);
    if (sig === 0x02014b50) v.setUint32(i + 24, size, true);
  }
  return out;
}

test.describe("file tools", () => {
  test("ZIP creator and extractor round-trip files", async ({ page }) => {
    await open(page, "zip-file-creator", [file("a.txt", strToU8("hello"), "text/plain"), file("b.txt", strToU8("world"), "text/plain")]);
    await page.getByRole("button", { name: /^Create ZIP/ }).click();
    const zip = await downloadResult(page);
    expect(zip.name).toBe("archive.zip");
    const files = unzip(zip.bytes);
    expect(Object.keys(files).sort()).toEqual(["a.txt", "b.txt"]);
    expect(Buffer.from(files["b.txt"]).toString()).toBe("world");

    await open(page, "zip-file-extractor", [file("archive.zip", zip.bytes, "application/zip")]);
    await expect(page.getByRole("heading", { name: /2 files/ })).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download a.txt" }).click()]);
    expect(download.suggestedFilename()).toBe("a.txt");
    expect(Buffer.concat(await (await download.createReadStream()).toArray()).toString()).toBe("hello");
  });

  test("ZIP extractor blocks zip bombs and unsafe paths", async ({ page }) => {
    const bomb = lieAboutSize(zipSync({ "../../evil.txt": strToU8("x") }, { level: 0 }), 900 * 1024 ** 2);
    await open(page, "zip-file-extractor", [file("bomb.zip", bomb, "application/zip")]);
    await expect(page.getByText(/possible zip bomb/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Download ../../evil.txt" })).toBeDisabled();

    const huge = lieAboutSize(zipSync({ a: strToU8("a"), b: strToU8("b"), c: strToU8("c"), d: strToU8("d"), e: strToU8("e") }, { level: 0 }), 0xffff_fff0);
    await open(page, "zip-file-extractor", [file("huge.zip", huge, "application/zip")]);
    await expect(page.getByText(/more than 4 GB/)).toBeVisible();

    await open(page, "zip-file-extractor", [file("fake.zip", strToU8("not a zip"), "application/zip")]);
    await expect(page.getByText(/isn't a ZIP file/)).toBeVisible();
  });

  test("ZIP extractor stops entries that unpack bigger than declared", async ({ page }) => {
    const lying = lieAboutSize(zipSync({ "big.txt": new Uint8Array(100_000) }, { level: 9 }), 10);
    await open(page, "zip-file-extractor", [file("lying.zip", lying, "application/zip")]);
    await page.getByRole("button", { name: "Download big.txt" }).click();
    await expect(page.getByText(/more than the archive says/)).toBeVisible();
  });

  test("file checksums match known values and compare", async ({ page }) => {
    await open(page, "file-checksum-generator", [file("abc.txt", strToU8("abc"), "text/plain")]);
    await page.getByLabel("Expected checksum (optional, to compare)").fill("SHA256: BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
    await page.getByRole("button", { name: "Calculate checksums" }).click();
    await expect(page.getByText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")).toBeVisible();
    await expect(page.getByText("900150983cd24fb0d6963f7d28e17f72")).toBeVisible();
    await expect(page.getByText(/^Match: the SHA-256 checksum/)).toBeVisible();
  });

  test("QR codes round-trip from generator to reader", async ({ page }) => {
    const text = "https://tools.abrahamdan.com/?q=privora-test";
    await page.goto("/qr-code-generator/");
    await fill(page, [["Text or link", text]]);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PNG" }).click()]);
    const png = Buffer.concat(await (await download.createReadStream()).toArray());

    await open(page, "qr-code-reader", [file("qr.png", png, "image/png")]);
    await expect(page.getByRole("heading", { name: "QR code content" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("pre").filter({ hasText: text })).toBeVisible();
    await expect(page.getByText(/scam links/)).toBeVisible();
  });
});
