import { sniff } from "../src/tools/image/core/formats";
import { encodePng } from "../src/tools/pdf/core/png";
import { choose, decode, downloadResult, expect, file, open, run, test } from "./fixtures";

// AI tools end to end, with the real self-hosted model. Playwright's browsers
// have no WebGPU here, so these runs prove the CPU (WebAssembly) path; WebGPU
// is the same code with another backend. The shared guard proves the image is
// never uploaded and nothing is stored.

test.describe.configure({ mode: "serial" });
test.setTimeout(900_000);
const AI = 420_000; // single-thread CPU inference can take a few minutes on a busy machine

/** A synthetic photo: a shaded red ball on a pale, slightly graded backdrop. */
function ballPhoto(w: number, h: number): Uint8Array {
  const px = new Uint8Array(w * h * 4);
  const r = Math.min(w, h) * 0.28;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.hypot(x - w / 2, y - h / 2) < r) {
        const light = 1 - (0.45 * Math.hypot(x - w / 2 + r / 3, y - h / 2 + r / 3)) / (2 * r);
        px.set([Math.round(220 * light), Math.round(30 * light), Math.round(40 * light), 255], i);
      } else {
        const g = 225 + Math.round((15 * y) / h);
        px.set([g, g, g + 8, 255], i);
      }
    }
  return encodePng(w, h, 4, px);
}

function solid(w: number, h: number, rgb: number[]): Uint8Array {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set([...rgb, 255], i * 4);
  return encodePng(w, h, 4, px);
}

const near = (a: number[], b: number[], tol = 40) => b.every((v, i) => Math.abs(a[i] - v) <= tol);
const CENTRE_AND_CORNER = (w: number, h: number): [number, number][] => [[w / 2, h / 2], [4, 4]];

test("removes the background: failed download, progress, transparent PNG, new backgrounds without re-running, offline large image", async ({ page, context }) => {
  const modelRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/models/")) modelRequests.push(r.url());
  });

  await open(page, "remove-background", [file("ball.png", ballPhoto(640, 480), "image/png")]);
  await expect(page.getByText(/One-time download: about \d+ MB/)).toBeVisible();
  await expect(page.getByText(/your images are never sent to an AI processing server/i)).toBeVisible();

  // The model can't be downloaded: a clear message, and nothing else happens.
  await page.route("**/models/**", (r) => r.abort());
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.getByText(/AI model couldn't be downloaded/)).toBeVisible();
  await page.unroute("**/models/**");

  // Progress, then a transparent PNG: subject kept, background gone.
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.getByText(/(Downloading|Checking|Starting) the AI model|Removing the background/).first()).toBeVisible();
  const cut = await downloadResult(page, AI);
  expect(cut.name).toBe("ball-no-background.png");
  expect(sniff(cut.bytes)).toBe("png");
  let d = await decode(page, cut.bytes, CENTRE_AND_CORNER(640, 480));
  expect([d.width, d.height]).toEqual([640, 480]);
  expect(d.px[0][3], "subject opaque").toBeGreaterThan(200);
  expect(d.px[1][3], "background transparent").toBeLessThan(30);
  await expect(page.getByText(/AI ran on your (CPU|GPU) in [\d.]+ s/)).toBeVisible();

  // A solid colour as JPG, then the user's own image: the AI doesn't run again.
  await page.getByRole("button", { name: "Change settings" }).click();
  await choose(page, "Background", "Solid colour");
  await page.getByLabel("Background colour").fill("#00ff00");
  await choose(page, "Save as", "JPG");
  const jpg = await run(page, "Remove background");
  expect(sniff(jpg.bytes)).toBe("jpeg");
  d = await decode(page, jpg.bytes, CENTRE_AND_CORNER(640, 480));
  expect(near(d.px[1], [0, 255, 0]), "green background").toBe(true);
  expect(near(d.px[0], [200, 30, 40], 60), "red subject").toBe(true);

  await page.getByRole("button", { name: "Change settings" }).click();
  await choose(page, "Background", "Your own image");
  await page.getByLabel("Background image").setInputFiles(file("sky.png", solid(64, 48, [30, 90, 230]), "image/png"));
  await choose(page, "Save as", "PNG");
  const withImage = await run(page, "Remove background");
  d = await decode(page, withImage.bytes, CENTRE_AND_CORNER(640, 480));
  expect(near(d.px[1], [30, 90, 230, 255]), "background image").toBe(true);

  // Offline, with a large photo: the model is already loaded, so it still works.
  await context.setOffline(true);
  await page.getByRole("button", { name: "Start over" }).click();
  await page.locator('input[type="file"]').first().setInputFiles(file("large.png", ballPhoto(4000, 3000), "image/png"));
  await expect(page.getByText("large.png")).toBeVisible();
  const large = await run(page, "Remove background", AI);
  d = await decode(page, large.bytes, CENTRE_AND_CORNER(4000, 3000));
  expect([d.width, d.height]).toEqual([4000, 3000]);
  expect(d.px[0][3]).toBeGreaterThan(200);
  expect(d.px[1][3]).toBeLessThan(30);
  await context.setOffline(false);

  // One failed and one successful model request: the model was downloaded once.
  expect(modelRequests).toHaveLength(2);
});

test("creates a subject mask, and cancel stops the AI", async ({ page }) => {
  await open(page, "ai-subject-mask", [file("ball.png", ballPhoto(320, 240), "image/png")]);

  // Cancel while the model is starting or running: back to the settings.
  await page.getByRole("button", { name: "Create mask" }).click();
  await expect(page.getByText(/Starting the AI model|Finding the subject|Removing the background/).first()).toBeVisible({ timeout: AI });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Create mask" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Download/ })).toHaveCount(0);

  // Run again: the model restarts from memory (no second download).
  const mask = await run(page, "Create mask", AI);
  expect(mask.name).toBe("ball-mask.png");
  const d = await decode(page, mask.bytes, CENTRE_AND_CORNER(320, 240));
  expect(near(d.px[0], [255, 255, 255, 255], 30), "white subject").toBe(true);
  expect(near(d.px[1], [0, 0, 0, 255], 30), "black background").toBe(true);
});

test("refuses a damaged model and explains unsupported browsers", async ({ page }) => {
  await page.route("**/models/**", (r) => r.fulfill({ status: 200, contentType: "application/gzip", body: Buffer.from("not a model") }));
  await open(page, "remove-background", [file("ball.png", ballPhoto(64, 48), "image/png")]);
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.getByText(/download was incomplete or damaged/)).toBeVisible();

  await page.addInitScript(() => {
    delete (window as { DecompressionStream?: unknown }).DecompressionStream;
  });
  await open(page, "remove-background", [file("ball.png", ballPhoto(64, 48), "image/png")]);
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.getByText(/This browser can't run the AI model/)).toBeVisible();
});
