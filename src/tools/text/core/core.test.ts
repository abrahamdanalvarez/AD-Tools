// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as calc from "./calc";
import { contrast, parseColour, toCmyk, toHex, toHsl, toRgb } from "./colour";
import { nextRuns, parseCron } from "./cron";
import { csvToJson, formatJson, formatYaml, jsonToCsv, jsonToYaml, minifyJson, parseJson, yamlToJson } from "./data";
import { decodeBase64, decodeEntities, decodeJwt, decodeUrl, encodeBase64, encodeEntities, encodeUrl } from "./encode";
import { formatCode, formatSql } from "./format";
import { hashFile, hashText } from "./hash";
import { entropyBits, password, randomInt, randomString, uuidV4, uuidV7 } from "./random";
import { regexJob } from "./regex";
import * as t from "./text";
import { dateFormats, fromTimestamp, isoWeek, parseDate } from "./time";

describe("text", () => {
  it("counts words, sentences, paragraphs and graphemes", () => {
    const s = t.stats("Hello world. How are you?\n\nI'm fine! 👍🏽 café");
    expect(s.words).toBe(8);
    expect(s.sentences).toBe(4);
    expect(s.paragraphs).toBe(2);
    expect(s.lines).toBe(3);
    expect(t.countGraphemes("👍🏽é")).toBe(2);
    expect(t.stats("").words).toBe(0);
  });

  it("converts case", () => {
    expect(t.convertCase("the lord of the rings", "title")).toBe("The Lord of the Rings");
    expect(t.convertCase("hello WORLD. bye now", "sentence")).toBe("Hello world. Bye now");
    expect(t.convertCase("Hello big World", "camel")).toBe("helloBigWorld");
    expect(t.convertCase("helloBigWorld", "snake")).toBe("hello_big_world");
    expect(t.convertCase("Hello big World", "kebab")).toBe("hello-big-world");
    expect(t.convertCase("hello big", "constant")).toBe("HELLO_BIG");
    expect(t.convertCase("ÉCOLE", "lower")).toBe("école");
  });

  it("handles lines", () => {
    expect(t.removeDuplicateLines("a\nb\nA\na\n\n", { ignoreCase: true, trim: true, keepEmpty: false })).toEqual({ text: "a\nb\n", removed: 3 });
    expect(t.sortLines("b10\na2\nb2", { mode: "natural", descending: false, ignoreCase: true, removeEmpty: false })).toBe("a2\nb2\nb10");
    expect(t.sortLines("x 10\ny 9\nz -1", { mode: "numeric", descending: true, ignoreCase: true, removeEmpty: false })).toBe("x 10\ny 9\nz -1");
    expect(t.reverseText("ab👍🏽", "characters")).toBe("👍🏽ba");
    expect(t.reverseText("one two\nthree", "lines")).toBe("three\none two");
    expect(t.removeEmptyLines("a\n\n \nb", true)).toEqual({ text: "a\nb", removed: 2 });
    expect(t.removeExtraSpaces("  a   b \n  c ", { trimLines: true, keepLineBreaks: true })).toBe("a b\nc");
  });

  it("cleans, replaces and slugifies", () => {
    const all = { invisible: true, smartQuotes: true, dashes: true, nbsp: true, tabs: true, extraSpaces: true, trimLines: true, emptyLines: true, htmlTags: true };
    expect(t.cleanText("“Hi”\u200B — it’s\u00A0<b>ok</b>\n\n\n\nend", all)).toBe('"Hi" - it\'s ok\n\nend');
    expect(t.replacePlain("Cat cat cats", "cat", "dog", true, true)).toEqual({ text: "dog dog cats", count: 2 });
    expect(t.replacePlain("a.b", ".", "-", false, false)).toEqual({ text: "a-b", count: 1 });
    expect(t.slugify("Crème Brûlée & Café — 2026!", { separator: "-", lowercase: true, maxLength: 0 })).toBe("creme-brulee-and-cafe-2026");
  });

  it("generates repeatable lorem ipsum and reading time", () => {
    const a = t.lorem({ unit: "paragraphs", count: 3, startWithLorem: true, seed: 1 });
    expect(a).toBe(t.lorem({ unit: "paragraphs", count: 3, startWithLorem: true, seed: 1 }));
    expect(a.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
    expect(a.split("\n\n")).toHaveLength(3);
    expect(t.countWords(t.lorem({ unit: "words", count: 25, startWithLorem: false, seed: 2 }))).toBe(25);
    expect(t.readingSeconds(475, 238)).toBe(120);
    expect(t.formatDuration(125)).toBe("2 min 5 s");
  });
});

describe("encoding", () => {
  it("round-trips Base64 and URL encoding with Unicode", () => {
    expect(encodeBase64("héllo ✓", false)).toBe("aMOpbGxvIOKckw==");
    expect(decodeBase64("aMOpbGxvIOKckw")).toBe("héllo ✓");
    expect(encodeBase64("??>", true)).toBe("Pz8-");
    expect(() => decodeBase64("abc$")).toThrow(/valid Base64/);
    expect(() => decodeBase64("/w==")).toThrow(/binary/);
    expect(encodeUrl("a b&c/é", "component")).toBe("a%20b%26c%2F%C3%A9");
    expect(decodeUrl("a+b%20c", true)).toBe("a b c");
    expect(() => decodeUrl("%E0%A4%A", false)).toThrow(/broken/);
  });

  it("encodes and decodes HTML entities", () => {
    expect(encodeEntities(`<a href="x">Tom & 'Jé'</a>`, false)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jé&#39;&lt;/a&gt;");
    expect(encodeEntities("é😀", true)).toBe("&#233;&#128512;");
    expect(decodeEntities("&lt;p&gt; &amp;amp; &#x1F600; &#233; &copy; &bogus;")).toBe("<p> &amp; 😀 é © &bogus;");
  });

  it("decodes a JWT without verifying it", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const d = decodeJwt(`Bearer ${token}`);
    expect(d.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(d.payload).toMatchObject({ name: "John Doe" });
    expect(d.times[0]).toEqual({ claim: "iat", date: new Date(1516239022000) });
    expect(() => decodeJwt("a.b")).toThrow(/three parts/);
    expect(() => decodeJwt("e30.bm90IGpzb24.x")).toThrow(/payload/);
    expect(() => decodeJwt("a.b.c.d.e")).toThrow(/encrypted token \(JWE\)/);
  });
});

describe("data formats", () => {
  it("formats, validates and minifies JSON", () => {
    expect(formatJson('{"b":1,"a":[1,2]}', "2", true)).toBe('{\n  "a": [\n    1,\n    2\n  ],\n  "b": 1\n}');
    expect(minifyJson('{ "a" : [ 1 , 2 ] }')).toBe('{"a":[1,2]}');
    expect(() => parseJson('{"a":1,}')).toThrow(/Invalid JSON/);
    expect(() => parseJson('{\n  "a": 1\n  "b": 2\n}')).toThrow(/line 3/);
  });

  it("converts JSON and CSV both ways, defusing spreadsheet formulas", async () => {
    const { csv, rows, columns } = await jsonToCsv('[{"name":"Ann","tags":["x"],"addr":{"city":"Oslo, NO"}},{"name":"=SUM(A1)","n":-2}]', ",");
    expect([rows, columns]).toEqual([2, 4]);
    expect(csv).toBe('name,tags,addr.city,n\nAnn,"[""x""]","Oslo, NO",\n\'=SUM(A1),,,-2');
    const { json } = await csvToJson('a,b\n1,"x, y"\n2,true', { header: true, types: true, delimiter: "auto" });
    expect(json).toEqual([{ a: 1, b: "x, y" }, { a: 2, b: true }]);
  });

  it("converts YAML and keeps comments when formatting", async () => {
    expect(await yamlToJson("a: 1\nb: [x, y]\n", "2")).toBe('{\n  "a": 1,\n  "b": [\n    "x",\n    "y"\n  ]\n}');
    expect(await jsonToYaml('{"a":{"b":[1,2]}}', 2)).toBe("a:\n  b:\n    - 1\n    - 2\n");
    expect(await formatYaml("# keep\na:   {b: 1}\n", 2)).toBe("# keep\na: { b: 1 }\n");
    await expect(yamlToJson("a: [1, 2\n", "2")).rejects.toThrow(/Invalid YAML/);
    // An alias bomb is refused instead of expanding.
    const bomb = ["a: &a [x, x, x, x, x, x, x, x, x, x]", ...Array.from({ length: 8 }, (_, i) => `${"bcdefghi"[i]}: &${"bcdefghi"[i]} [${Array(10).fill(`*${"abcdefgh"[i]}`).join(", ")}]`)].join("\n");
    await expect(yamlToJson(bomb, "2")).rejects.toThrow();
  });
});

describe("formatters", () => {
  it("formats JavaScript, CSS, HTML and SQL without running them", async () => {
    expect(await formatCode("const a={b:1};alert(a)", "javascript", { indent: 2, printWidth: 80 })).toBe("const a = { b: 1 };\nalert(a);\n");
    expect(await formatCode("a{color:red;margin:0}", "css", { indent: 2, printWidth: 80 })).toBe("a {\n  color: red;\n  margin: 0;\n}\n");
    expect(await formatCode("<div><p>Hi</p></div>", "html", { indent: 2, printWidth: 80 })).toBe("<div><p>Hi</p></div>\n");
    await expect(formatCode("const = ;", "javascript", { indent: 2, printWidth: 80 })).rejects.toThrow(/line 1/);
    expect(await formatSql("select a,b from t where x=1", { dialect: "sql", indent: 2, keywordCase: "upper" })).toBe("SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1");
  });
});

describe("random", () => {
  it("uses unbiased secure randomness", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i++) counts[randomInt(3)]++;
    for (const c of counts) expect(c).toBeGreaterThan(850);
    expect(randomString(20, "ab")).toMatch(/^[ab]{20}$/);
  });

  it("makes passwords with every chosen character type", () => {
    for (let i = 0; i < 50; i++) {
      const p = password({ length: 12, upper: true, lower: true, digits: true, symbols: true, avoidAmbiguous: true });
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
      expect(p).not.toMatch(/[Il1O0o]/);
    }
    expect(Math.round(entropyBits(16, 94))).toBe(105);
  });

  it("makes RFC 9562 UUIDs", () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const v7 = uuidV7(0x0123456789ab);
    expect(v7).toMatch(/^01234567-89ab-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("cron", () => {
  it("parses fields, names and steps, and lists next runs", () => {
    const c = parseCron("*/15 9-17 * * MON-FRI");
    expect([...c.sets[0]]).toEqual([0, 15, 30, 45]);
    expect([...c.sets[4]]).toEqual([1, 2, 3, 4, 5]);
    // Friday 2026-11-27 17:50 → next is Monday 09:00.
    const runs = nextRuns(c, new Date(2026, 10, 27, 17, 50), 2);
    expect(runs.map((d) => [d.getDate(), d.getHours(), d.getMinutes()])).toEqual([[30, 9, 0], [30, 9, 15]]);
    expect(nextRuns(parseCron("@yearly"), new Date(2026, 10, 27), 1)[0]).toEqual(new Date(2027, 0, 1, 0, 0));
    // Day of month OR day of week when both are set: the 1st, or any Sunday.
    expect(nextRuns(parseCron("0 0 1 * 0"), new Date(2026, 10, 27), 2).map((d) => d.getDate())).toEqual([29, 1]);
    expect(() => parseCron("60 * * * *")).toThrow(/minute/);
    expect(() => parseCron("* * *")).toThrow(/5 fields/);
  });
});

describe("colour", () => {
  it("parses and converts", () => {
    const c = parseColour("#ff8800");
    expect(toRgb(c)).toBe("rgb(255, 136, 0)");
    expect(toHsl(c)).toBe("hsl(32, 100%, 50%)");
    expect(toCmyk(c)).toBe("cmyk(0%, 47%, 100%, 0%)");
    expect(toHex(parseColour("rgb(255 136 0 / 50%)"))).toBe("#ff880080");
    expect(toHex(parseColour("hsl(32, 100%, 50%)"))).toBe("#ff8800");
    expect(toHex(parseColour("0f8"))).toBe("#00ff88");
    expect(toHex(parseColour("12, 34, 56"))).toBe("#0c2238");
    expect(contrast(parseColour("#000"), parseColour("#fff"))).toBe(21);
    expect(() => parseColour("rgb(300, 0, 0)")).toThrow(/0 to 255/);
    expect(() => parseColour("blue-ish")).toThrow(/HEX/);
  });
});

describe("time", () => {
  it("converts timestamps and dates", () => {
    expect(fromTimestamp("1700000000", "auto")).toEqual({ date: new Date(1.7e12), unit: "s" });
    expect(fromTimestamp("1700000000000", "auto").unit).toBe("ms");
    expect(() => fromTimestamp("12abc", "auto")).toThrow();
    expect(parseDate("2026-11-27").getHours()).toBe(0);
    expect(parseDate("2026-11-27T10:00:00Z").toISOString()).toBe("2026-11-27T10:00:00.000Z");
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ week: 1, year: 2026 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ week: 53, year: 2026 });
    const rows = Object.fromEntries(dateFormats(new Date(Date.UTC(2026, 10, 27, 6, 30)), "UTC"));
    expect(rows["Unix seconds"]).toBe("1795761000");
    expect(rows["RFC 2822 / HTTP"]).toBe("Fri, 27 Nov 2026 06:30:00 +0000");
  });
});

describe("calculators", () => {
  it("converts units exactly", () => {
    expect(calc.convertUnit(1, "length", "in", "cm")).toBeCloseTo(2.54, 12);
    expect(calc.convertUnit(100, "temperature", "c", "f")).toBeCloseTo(212, 12);
    expect(calc.convertUnit(1, "volume", "gal", "l")).toBeCloseTo(3.785411784, 12);
    expect(() => calc.convertUnit(-300, "temperature", "c", "k")).toThrow(/absolute zero/);
    expect(calc.fmt(1234.5678)).toBe("1,234.5678");
    expect(calc.fmt(1e-9)).toBe("1e-9");
  });

  it("calculates percentages", () => {
    expect(calc.percent("of", 20, 150).value).toBe(30);
    expect(calc.percent("is-what", 30, 150).value).toBe(20);
    expect(calc.percent("change", 80, 100).text).toBe("From 80 to 100 is a rise of 25%");
    expect(() => calc.percent("is-what", 1, 0)).toThrow();
  });

  it("calculates dates and ages like a calendar", () => {
    const d = (s: string) => calc.parseDay(s, "a date");
    expect(calc.ymd(d("2024-01-31"), d("2024-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
    expect(calc.daysBetween(d("2024-01-01"), d("2025-01-01"))).toBe(366);
    expect(calc.weekdaysBetween(d("2026-11-23"), d("2026-11-30"))).toBe(5);
    expect(calc.dayString(calc.addToDate(d("2024-01-31"), 1, "months"))).toBe("2024-02-29");
    const a = calc.age(d("2000-02-29"), d("2026-11-27"));
    expect([a.years, a.months, a.days]).toEqual([26, 8, 29]);
    expect(calc.dayString(a.nextBirthday)).toBe("2027-02-28");
    expect(() => calc.parseDay("2026-02-30", "a date")).toThrow();
  });

  it("calculates durations, loans, BMI, tips and discounts", () => {
    expect(calc.hms(calc.clockDuration(calc.parseClock("22:30", "start"), calc.parseClock("06:15", "end"), 30))).toBe("7:15:00");
    const l = calc.loan(200000, 6, 30, 12);
    expect(calc.money(l.payment)).toBe("1,199.10");
    expect(l.schedule.at(-1)!.balance).toBe(0);
    expect(calc.money(l.totalPaid)).toBe(calc.money(l.schedule.reduce((s, x) => s + x.payment, 0)));
    expect(calc.loan(1200, 0, 1, 12).payment).toBe(100);
    expect(calc.bmi(70, 1.75).bmi).toBeCloseTo(22.857, 3);
    expect(calc.bmi(70, 1.75).category).toBe("Healthy weight");
    expect(calc.tip(100, 15, 4, false)).toEqual({ tip: 15, total: 115, perPerson: 28.75, totalPaid: 115 });
    expect(calc.discount(100, [20, 10], 0).final).toBeCloseTo(72, 10);
  });
});

describe("regex and hashes", () => {
  it("lists matches with groups and replaces with $ references", () => {
    const r = regexJob({ pattern: "(?<y>\\d{4})-(\\d{2})", flags: "g", text: "2024-01 and 2025-12" });
    expect(r).toMatchObject({ kind: "matches", total: 2, matches: [{ index: 0, text: "2024-01", groups: ["2024", "01"], named: { y: "2024" } }, { index: 12 }] });
    expect(regexJob({ pattern: "(\\w+)@(\\w+)", flags: "g", text: "a@b c@d", replace: "$2 at $<x>$1" })).toMatchObject({ kind: "replace", count: 2 });
    expect(regexJob({ pattern: "(?<n>\\w)", flags: "", text: "ab", replace: "[$<n>]" })).toEqual({ kind: "replace", text: "[a]b", count: 1 });
    expect(() => regexJob({ pattern: "(", flags: "", text: "" })).toThrow();
    expect(() => regexJob({ pattern: "a", flags: "gg", text: "" })).toThrow(/flags/);
  });

  it("hashes text and streamed files like Node does", async () => {
    const h = await hashText("héllo", ["md5", "sha256", "sha3-256", "crc32"]);
    expect(h.md5).toBe(createHash("md5").update("héllo").digest("hex"));
    expect(h.sha256).toBe(createHash("sha256").update("héllo").digest("hex"));
    expect(h["sha3-256"]).toBe(createHash("sha3-256").update("héllo").digest("hex"));
    expect(h.crc32).toMatch(/^[0-9a-f]{8}$/);
    const big = new Uint8Array(3_000_000).map((_, i) => i % 251);
    const progress: number[] = [];
    const f = await hashFile(new Blob([big]), ["sha512"], { onProgress: (p) => progress.push(p) });
    expect(f.sha512).toBe(createHash("sha512").update(big).digest("hex"));
    expect(progress.at(-1)).toBe(1);
  });
});
