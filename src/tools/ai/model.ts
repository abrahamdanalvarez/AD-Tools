// The background-removal model. Shared by the app and scripts/models/fetch.ts,
// which builds public/models/<file> from the pinned upstream file.

export interface ModelManifest {
  /** SHA-256 and size of the model the app runs (after unzipping). The app checks both. */
  sha256: string;
  bytes: number;
  /** Approximate download (the gzipped file), shown to users. */
  downloadMB: number;
  /** Square input size the model expects. */
  inputSize: number;
  /** Upstream file (pinned revision) and its SHA-256. */
  source: string;
  sourceSha256: string;
  licence: string;
}

/**
 * BiRefNet_lite (MIT, © 2024 Peng Zheng), 512 × 512 ONNX export by Studio Ludens
 * (MIT). The 1024 export needs more than the 4 GB WebAssembly memory limit.
 * scripts/models/quantize.py stores its weights in 8 bits; the file is gzipped.
 */
export const birefnet: ModelManifest = {
  sha256: "c64e1a89654d726f16de3343e7d11d3407c6343a0ffd30bed99238ace35372a6",
  bytes: 59_616_685,
  downloadMB: 41,
  inputSize: 512,
  source: "https://huggingface.co/studioludens/birefnet-lite-512/resolve/962e67969ec6acec9c19fab76acee4f5e22e990c/onnx/model.onnx",
  sourceSha256: "1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2",
  licence: "MIT",
};

/** The hash in the name lets browsers cache the file forever: a new model gets a new name. */
export const modelFile = (m: ModelManifest) => `birefnet-lite-int8-${m.sha256.slice(0, 8)}.onnx.gz`;
export const modelPath = (m: ModelManifest) => `/models/${modelFile(m)}`;
