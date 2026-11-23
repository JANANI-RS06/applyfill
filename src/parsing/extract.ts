import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round(item.transform[5] / 3);
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], s: item.str });
      rows.set(y, row);
    }
    const ys = [...rows.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
      pages.push(parts.map((p) => p.s).join(" ").replace(/\s{2,}/g, "  "));
    }
  }
  return pages.join("\n");
}

export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const res = await mammoth.extractRawText({ arrayBuffer: data.slice(0) });
  return res.value;
}

export async function extractText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdfText(data);
  if (name.endsWith(".docx")) return extractDocxText(data);
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return new TextDecoder().decode(data);
  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}
