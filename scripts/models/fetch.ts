// Builds the self-hosted AI model in public/models/ (git-ignored) from the
// pinned upstream file. Run once after cloning, before `npm run build`:
//
//   pip install -r scripts/models/requirements.txt
//   npm run fetch-models
//
// Steps: download the upstream ONNX file (cached in node_modules/.cache),
// check its SHA-256, quantise the weights with quantize.py, check the result's
// SHA-256 against src/tools/ai/model.ts, then gzip it into public/models/.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import { birefnet, modelFile } from "../../src/tools/ai/model.ts";

const root = resolve(import.meta.dirname, "../..");
const cache = join(root, "node_modules/.cache/privora-models");
const out = join(root, "public/models");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function main() {
  const target = join(out, modelFile(birefnet));
  if (existsSync(target) && sha(gunzipSync(await readFile(target))) === birefnet.sha256) {
    console.log(`Model is up to date: public/models/${modelFile(birefnet)}`);
    return;
  }
  await mkdir(cache, { recursive: true });
  const source = join(cache, "birefnet-lite-512-fp32.onnx");
  if (!existsSync(source) || sha(await readFile(source)) !== birefnet.sourceSha256) {
    console.log(`Downloading ${birefnet.source} (192 MB)…`);
    const res = await fetch(birefnet.source);
    if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(source));
    if (sha(await readFile(source)) !== birefnet.sourceSha256) {
      await rm(source);
      throw new Error("The downloaded file's SHA-256 doesn't match the pinned value. Nothing was installed.");
    }
  }

  const quantised = join(cache, "birefnet-lite-512-int8.onnx");
  const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
  const run = spawnSync(python, [join(root, "scripts/models/quantize.py"), source, quantised], { stdio: "inherit" });
  if (run.status !== 0)
    throw new Error("Quantising failed. Install Python 3, run `pip install -r scripts/models/requirements.txt`, or set PYTHON to your Python.");
  const bytes = await readFile(quantised);
  const got = sha(bytes);
  if (got !== birefnet.sha256)
    throw new Error(`The quantised model's SHA-256 is ${got}, not ${birefnet.sha256}. Check the package versions in scripts/models/requirements.txt.`);

  await mkdir(out, { recursive: true });
  for (const f of await readdir(out)) if (f.startsWith("birefnet-lite-int8-") && f !== modelFile(birefnet)) await rm(join(out, f));
  await writeFile(target, gzipSync(bytes, { level: 9 }));
  console.log(`Wrote public/models/${modelFile(birefnet)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
