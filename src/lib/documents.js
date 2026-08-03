import { cleanText, toSlug } from "./text.js";

const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_MARGIN_X = 54;
const PDF_START_Y = 742;
const PDF_FONT_SIZE = 10;
const PDF_LINE_HEIGHT = 14;
const PDF_MAX_LINES = 49;
const PDF_WRAP_CHARS = 92;

const DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function buildDocumentArtifacts({ title, markdown }) {
  const safeTitle = cleanText(title) || "Vouch Application Packet";
  const safeMarkdown = cleanText(markdown);
  const baseName = toSlug(safeTitle) || "vouch-application-packet";
  const pdf = buildPdfDocument(safeMarkdown);
  const docx = buildDocxDocument(safeMarkdown);

  return [
    {
      name: "pdf",
      filename: `${baseName}.pdf`,
      mediaType: "application/pdf",
      encoding: "base64",
      data: pdf.toString("base64"),
      sizeBytes: pdf.length,
      description: "Downloadable PDF version of the Vouch application packet."
    },
    {
      name: "docx",
      filename: `${baseName}.docx`,
      mediaType: DOCX_MEDIA_TYPE,
      encoding: "base64",
      data: docx.toString("base64"),
      sizeBytes: docx.length,
      description: "Downloadable Word document version of the Vouch application packet."
    }
  ];
}

function buildPdfDocument(markdown) {
  const pages = paginateLines(markdownToPdfLines(markdown));
  const objects = [null, null, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageIds = [];

  for (const pageLines of pages) {
    const contentStream = buildPdfContentStream(pageLines);
    const contentId = addPdfObject(
      objects,
      [
        `<< /Length ${Buffer.byteLength(contentStream, "latin1")} >>`,
        "stream",
        contentStream,
        "endstream"
      ].join("\n")
    );
    const pageId = addPdfObject(
      objects,
      [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}]`,
        "/Resources << /Font << /F1 3 0 R >> >>",
        `/Contents ${contentId} 0 R`,
        ">>"
      ].join(" ")
    );
    pageIds.push(pageId);
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  return serializePdf(objects);
}

function markdownToPdfLines(markdown) {
  return cleanText(markdown)
    .split("\n")
    .flatMap((line) => wrapPdfLine(markdownLineToPlainText(line)));
}

function markdownLineToPlainText(line) {
  return cleanText(line)
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "- ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function wrapPdfLine(line) {
  if (!line) {
    return [""];
  }

  const words = toPdfSafeText(line).split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > PDF_WRAP_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function paginateLines(lines) {
  const pages = [];

  for (let index = 0; index < lines.length; index += PDF_MAX_LINES) {
    pages.push(lines.slice(index, index + PDF_MAX_LINES));
  }

  return pages.length > 0 ? pages : [["Vouch application packet"]];
}

function buildPdfContentStream(lines) {
  const commands = [
    "BT",
    `/F1 ${PDF_FONT_SIZE} Tf`,
    `${PDF_LINE_HEIGHT} TL`,
    `${PDF_MARGIN_X} ${PDF_START_Y} Td`
  ];

  for (const line of lines) {
    if (line) {
      commands.push(`(${escapePdfText(line)}) Tj`);
    }
    commands.push("T*");
  }

  commands.push("ET");
  return commands.join("\n");
}

function addPdfObject(objects, body) {
  objects.push(body);
  return objects.length;
}

function serializePdf(objects) {
  const chunks = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
  const offsets = [0];
  let position = Buffer.byteLength(chunks[0], "latin1");

  objects.forEach((body, index) => {
    offsets.push(position);
    const objectText = `${index + 1} 0 obj\n${body}\nendobj\n`;
    chunks.push(objectText);
    position += Buffer.byteLength(objectText, "latin1");
  });

  const xrefOffset = position;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF"
  ].join("\n");
  chunks.push(xref);

  return Buffer.from(chunks.join(""), "latin1");
}

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toPdfSafeText(value) {
  return cleanText(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/₮/g, "T")
    .replace(/[^\x20-\x7E]/g, "");
}

function buildDocxDocument(markdown) {
  return zipStore([
    { name: "[Content_Types].xml", data: contentTypesXml() },
    { name: "_rels/.rels", data: packageRelsXml() },
    { name: "word/_rels/document.xml.rels", data: documentRelsXml() },
    { name: "word/document.xml", data: documentXml(markdown) },
    { name: "word/styles.xml", data: stylesXml() }
  ]);
}

function documentXml(markdown) {
  const paragraphs = cleanText(markdown)
    .split("\n")
    .map((line) => markdownLineToParagraph(line));

  return [
    xmlDeclaration(),
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    "<w:body>",
    ...paragraphs.map(paragraphXml),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>',
    "</w:body>",
    "</w:document>"
  ].join("");
}

function markdownLineToParagraph(line) {
  const cleaned = cleanText(line);
  if (!cleaned) {
    return { text: "", style: "Normal" };
  }

  if (cleaned.startsWith("# ")) {
    return { text: cleaned.replace(/^#\s+/, ""), style: "Heading1" };
  }

  if (cleaned.startsWith("## ")) {
    return { text: cleaned.replace(/^##\s+/, ""), style: "Heading2" };
  }

  if (/^[-*]\s+/.test(cleaned)) {
    return { text: cleaned.replace(/^[-*]\s+/, "- "), style: "ListParagraph" };
  }

  return {
    text: cleaned.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1"),
    style: /^\d+\.\s+/.test(cleaned) ? "ListParagraph" : "Normal"
  };
}

function paragraphXml(paragraph) {
  const style = paragraph.style === "Normal" ? "" : `<w:pPr><w:pStyle w:val="${paragraph.style}"/></w:pPr>`;
  const text = paragraph.text
    ? `<w:r><w:t xml:space="preserve">${escapeXml(paragraph.text)}</w:t></w:r>`
    : "";
  return `<w:p>${style}${text}</w:p>`;
}

function contentTypesXml() {
  return [
    xmlDeclaration(),
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    "</Types>"
  ].join("");
}

function packageRelsXml() {
  return [
    xmlDeclaration(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    "</Relationships>"
  ].join("");
}

function documentRelsXml() {
  return [
    xmlDeclaration(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    "</Relationships>"
  ].join("");
}

function stylesXml() {
  return [
    xmlDeclaration(),
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>',
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>',
    "</w:styles>"
  ].join("");
}

function xmlDeclaration() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
}

function escapeXml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const filename = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(filename.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, filename, data);
    centralParts.push(buildCentralDirectoryHeader({ filename, data, crc, offset }));
    offset += localHeader.length + filename.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function buildCentralDirectoryHeader({ filename, data, crc, offset }) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(filename.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, filename]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});
