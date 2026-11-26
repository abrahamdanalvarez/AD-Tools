import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, type PDFDocument } from "pdf-lib";

/** An image stored in the PDF as an XObject (inline images are not included). */
export interface ImageObject {
  ref: PDFRef;
  stream: PDFRawStream;
  /** 1-based page where it was first found. */
  page: number;
  width: number;
  height: number;
  /** Single filter name, "" if none, or "multiple". */
  filter: string;
  /** Colour components (1 gray, 3 RGB, 4 CMYK), 0 if unknown/indexed. */
  components: number;
  bitsPerComponent: number;
  /** Has a /Decode array, mask or other details that change how pixels are read. */
  special: boolean;
}

const N = PDFName.of;

function filterOf(dict: PDFDict): string {
  const f = dict.lookup(N("Filter"));
  if (!f) return "";
  if (f instanceof PDFName) return f.decodeText();
  if (f instanceof PDFArray) {
    if (f.size() === 1) {
      const only = f.lookup(0);
      return only instanceof PDFName ? only.decodeText() : "multiple";
    }
    return "multiple";
  }
  return "multiple";
}

function componentsOf(dict: PDFDict): number {
  const cs = dict.lookup(N("ColorSpace"));
  if (cs instanceof PDFName) {
    const name = cs.decodeText();
    return name === "DeviceGray" ? 1 : name === "DeviceRGB" ? 3 : name === "DeviceCMYK" ? 4 : 0;
  }
  if (cs instanceof PDFArray && cs.size() === 2) {
    const kind = cs.lookup(0);
    const profile = cs.lookup(1);
    if (kind instanceof PDFName && kind.decodeText() === "ICCBased" && profile instanceof PDFRawStream) {
      const n = profile.dict.lookup(N("N"));
      return n instanceof PDFNumber ? n.asNumber() : 0;
    }
  }
  return 0;
}

const num = (dict: PDFDict, key: string) => {
  const v = dict.lookup(N(key));
  return v instanceof PDFNumber ? v.asNumber() : 0;
};

/** Every image XObject reachable from page resources (including inside form XObjects), each once. */
export function collectImages(doc: PDFDocument): ImageObject[] {
  const found = new Map<string, ImageObject>();
  const visited = new Set<string>();

  const walk = (resources: PDFDict | undefined, page: number, depth: number) => {
    if (!resources || depth > 8) return;
    const xobjects = resources.lookupMaybe(N("XObject"), PDFDict);
    if (!xobjects) return;
    for (const [, value] of xobjects.entries()) {
      if (!(value instanceof PDFRef)) continue;
      const key = value.toString();
      if (visited.has(key)) continue;
      visited.add(key);
      const stream = doc.context.lookup(value);
      if (!(stream instanceof PDFRawStream)) continue;
      const subtype = stream.dict.lookup(N("Subtype"));
      if (!(subtype instanceof PDFName)) continue;
      if (subtype.decodeText() === "Form") {
        walk(stream.dict.lookupMaybe(N("Resources"), PDFDict), page, depth + 1);
      } else if (subtype.decodeText() === "Image") {
        const d = stream.dict;
        found.set(key, {
          ref: value,
          stream,
          page,
          width: num(d, "Width"),
          height: num(d, "Height"),
          filter: filterOf(d),
          components: componentsOf(d),
          bitsPerComponent: num(d, "BitsPerComponent"),
          special: d.has(N("Decode")) || d.has(N("ImageMask")) || d.has(N("Mask")),
        });
      }
    }
  };

  doc.getPages().forEach((p, i) => walk(p.node.Resources(), i + 1, 0));
  return [...found.values()];
}
