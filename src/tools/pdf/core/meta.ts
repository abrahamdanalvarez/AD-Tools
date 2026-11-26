import { PDFDict, PDFName, type PDFDocument } from "pdf-lib";
import { PdfError } from "./errors";
import { visualOf } from "./geometry";
import { openPdf, savePdf } from "./load";

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export interface PdfInfo {
  /** null when the file is encrypted (the page tree can't be read without the password). */
  pageCount: number | null;
  version: string;
  encrypted: boolean;
  /** null when encrypted (metadata strings are encrypted too). */
  metadata: PdfMetadata | null;
  created: string | null;
  modified: string | null;
  /** First page, visual size in points. */
  firstPage: { width: number; height: number } | null;
  sameSizePages: boolean;
  formFields: number;
  hasBookmarks: boolean;
  hasJavaScript: boolean;
  hasXmp: boolean;
  hasAttachments: boolean;
}

const emptyMeta = (): PdfMetadata => ({ title: "", author: "", subject: "", keywords: "", creator: "", producer: "" });

function readMeta(doc: PDFDocument): PdfMetadata {
  const safe = (f: () => string | undefined) => {
    try {
      return f() ?? "";
    } catch {
      return "";
    }
  };
  return {
    title: safe(() => doc.getTitle()),
    author: safe(() => doc.getAuthor()),
    subject: safe(() => doc.getSubject()),
    keywords: safe(() => doc.getKeywords()),
    creator: safe(() => doc.getCreator()),
    producer: safe(() => doc.getProducer()),
  };
}

const isoOf = (f: () => Date | undefined) => {
  try {
    const d = f();
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
};

function dictHas(dict: PDFDict | undefined, key: string): boolean {
  return !!dict && dict.has(PDFName.of(key));
}

/** Read-only facts about a PDF. Nothing in the file is executed. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await openPdf(bytes, { allowEncrypted: true });
  const version = /%PDF-(\d\.\d)/.exec(doc.context.header.toString())?.[1] ?? "unknown";
  if (doc.isEncrypted) {
    return {
      pageCount: null, version, encrypted: true, metadata: null, created: null, modified: null, firstPage: null,
      sameSizePages: true, formFields: 0, hasBookmarks: false, hasJavaScript: false, hasXmp: false, hasAttachments: false,
    };
  }
  const catalog = doc.catalog;
  const pages = doc.getPages();
  const sizes = pages.map((p) => visualOf(p));
  const first = sizes[0] ? { width: Math.round(sizes[0].width), height: Math.round(sizes[0].height) } : null;
  const sameSizePages = sizes.every((s) => Math.round(s.width) === first?.width && Math.round(s.height) === first?.height);
  const names = catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const open = catalog.lookupMaybe(PDFName.of("OpenAction"), PDFDict);
  const jsInOpen = !!open && open.lookupMaybe(PDFName.of("S"), PDFName)?.asString() === "/JavaScript";

  let formFields = 0;
  try {
    formFields = doc.getForm().getFields().length;
  } catch {
    formFields = 0;
  }
  return {
    pageCount: pages.length,
    version,
    encrypted: false,
    metadata: readMeta(doc),
    created: isoOf(() => doc.getCreationDate()),
    modified: isoOf(() => doc.getModificationDate()),
    firstPage: first,
    sameSizePages,
    formFields,
    hasBookmarks: dictHas(catalog, "Outlines"),
    hasJavaScript: dictHas(names, "JavaScript") || jsInOpen || dictHas(catalog, "AA"),
    hasXmp: dictHas(catalog, "Metadata"),
    hasAttachments: dictHas(names, "EmbeddedFiles"),
  };
}

/** Replace the document information fields. The XMP copy is removed so readers don't show stale values. */
export async function setMetadata(bytes: Uint8Array, m: PdfMetadata): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  doc.setTitle(m.title.trim());
  doc.setAuthor(m.author.trim());
  doc.setSubject(m.subject.trim());
  doc.setKeywords(m.keywords.split(",").map((k) => k.trim()).filter(Boolean));
  doc.setCreator(m.creator.trim());
  doc.setProducer(m.producer.trim());
  doc.setModificationDate(new Date());
  doc.catalog.delete(PDFName.of("Metadata"));
  return savePdf(doc);
}

/**
 * Remove document metadata: the information dictionary (title, author, dates,
 * software…), the XMP metadata stream, and per-page metadata and editing data.
 */
export async function stripMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const infoRef = doc.context.trailerInfo.Info;
  const info = infoRef ? doc.context.lookupMaybe(infoRef, PDFDict) : undefined;
  if (info) for (const key of info.keys()) info.delete(key);
  doc.catalog.delete(PDFName.of("Metadata"));
  doc.catalog.delete(PDFName.of("PieceInfo"));
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of("Metadata"));
    page.node.delete(PDFName.of("PieceInfo"));
  }
  return savePdf(doc);
}

export const metadataOf = async (bytes: Uint8Array) => (await inspectPdf(bytes)).metadata ?? emptyMeta();

/** Turn form fields into ordinary page content, so they can no longer be edited. */
export async function flattenForms(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  let fields = 0;
  try {
    fields = doc.getForm().getFields().length;
  } catch {
    throw new PdfError("damaged");
  }
  if (fields === 0) throw new PdfError("no-forms");
  try {
    doc.getForm().flatten({ updateFieldAppearances: true });
  } catch {
    throw new PdfError("chars");
  }
  return savePdf(doc);
}
