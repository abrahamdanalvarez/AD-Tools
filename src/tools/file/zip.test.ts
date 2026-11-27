// @vitest-environment node
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createZip, entryFileName, extractEntry, LIMITS, listZip } from "./zip";

/** Overwrites the declared unpacked size of every entry, in local and central headers. */
function lieAboutSize(zip: Uint8Array, size: number): Uint8Array {
  const out = zip.slice();
  const view = new DataView(out.buffer);
  for (let i = 0; i + 4 <= out.length; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50) view.setUint32(i + 22, size, true);
    if (sig === 0x02014b50) view.setUint32(i + 24, size, true);
  }
  return out;
}

describe("ZIP", () => {
  it("round-trips files and renames duplicates", async () => {
    const blob = await createZip([new File(["hello"], "a.txt"), new File(["world"], "a.txt"), new File([new Uint8Array(1000)], "z.bin")], 6);
    const data = new Uint8Array(await blob.arrayBuffer());
    const entries = listZip(data);
    expect(entries.map((e) => e.name)).toEqual(["a.txt", "a-2.txt", "z.bin"]);
    expect(entries.every((e) => !e.problem)).toBe(true);
    expect(await (await extractEntry(data, entries[1])).text()).toBe("world");
    expect((await extractEntry(data, entries[2])).size).toBe(1000);
  });

  it("refuses files that aren't ZIPs", () => {
    expect(() => listZip(strToU8("not a zip at all"))).toThrow(/isn't a ZIP/);
  });

  it("stops output larger than the archive declares", async () => {
    const real = zipSync({ "big.txt": new Uint8Array(100_000) }, { level: 9 });
    const lying = lieAboutSize(real, 10);
    const [entry] = listZip(lying);
    expect(entry.originalSize).toBe(10);
    await expect(extractEntry(lying, entry)).rejects.toThrow(/more than the archive says/);
  });

  it("flags suspicious ratios and oversize entries, and refuses huge totals", () => {
    const tiny = zipSync({ "x.txt": strToU8("x") }, { level: 0 });
    expect(listZip(lieAboutSize(tiny, 900 * 1024 ** 2))[0].problem).toMatch(/zip bomb/);
    expect(listZip(lieAboutSize(tiny, 0xffff_fff0))[0].problem).toMatch(/over 1 GB/);
    const many = zipSync({ a: strToU8("a"), b: strToU8("b"), c: strToU8("c"), d: strToU8("d"), e: strToU8("e") }, { level: 0 });
    expect(() => listZip(lieAboutSize(many, 0xffff_fff0))).toThrow(/more than 4 GB/);
  });

  it("refuses archives with too many entries", () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i <= LIMITS.entries; i++) files[`f${i}`] = new Uint8Array(0);
    expect(() => listZip(zipSync(files, { level: 0 }))).toThrow(/more than 10,000 files/);
  });

  it("makes entry names safe download names", () => {
    expect(entryFileName("../../etc/passwd")).toBe("passwd");
    expect(entryFileName("a\\..\\b:c?.txt")).toBe("b_c_.txt");
    expect(entryFileName("folder/")).toBe("folder");
    expect(entryFileName("")).toBe("file");
    expect(entryFileName("..")).toBe("file");
  });
});
