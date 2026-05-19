import crypto from "node:crypto";

export function slugify(value) {
  return String(value || "deck")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "deck";
}

export function createId(title) {
  return `${slugify(title)}-${crypto.randomBytes(4).toString("hex")}`;
}

export function createShareToken() {
  return `deck_${crypto.randomBytes(18).toString("hex")}`;
}

export function createVersion() {
  return "v1.0";
}

export function createExpiryDate(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function normalizeDeckHtml(html) {
  const source = String(html || "");
  if (!source.trim()) return "";

  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const responsiveCss = `<style id="vefy-viewer-fit">
    html, body { min-height: 100%; }
    img, video, canvas, svg { max-width: 100%; }
    table { max-width: 100%; }
  </style>`;

  let output = source;
  if (!/<meta\s+name=["']viewport["']/i.test(output)) {
    output = /<head[^>]*>/i.test(output)
      ? output.replace(/<head[^>]*>/i, (match) => `${match}\n${viewport}`)
      : `${viewport}\n${output}`;
  }

  return /<\/head>/i.test(output)
    ? output.replace(/<\/head>/i, `${responsiveCss}\n</head>`)
    : `${responsiveCss}\n${output}`;
}
