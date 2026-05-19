import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

const LOCAL_DECKS_DIR = path.join(process.cwd(), "data", "decks");

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveDeckHtml({ id, html }) {
  const blobPath = `decks/${id}.html`;

  if (!hasBlob()) {
    await fs.mkdir(LOCAL_DECKS_DIR, { recursive: true });
    const filePath = path.join(LOCAL_DECKS_DIR, `${id}.html`);
    await fs.writeFile(filePath, html, "utf8");
    return {
      blobPath,
      blobUrl: `/api/decks/${id}/content`
    };
  }

  const blob = await put(blobPath, html, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false,
    overwrite: true
  });

  return {
    blobPath: blob.pathname,
    blobUrl: blob.url
  };
}

export async function readLocalDeckHtml(id) {
  const filePath = path.join(LOCAL_DECKS_DIR, `${id}.html`);
  return fs.readFile(filePath, "utf8");
}

export async function deleteDeckBlob(deck) {
  if (!deck) return;
  if (!hasBlob()) {
    await fs.rm(path.join(LOCAL_DECKS_DIR, `${deck.id}.html`), { force: true });
    return;
  }

  if (deck.blobUrl) {
    await del(deck.blobUrl);
  }
}
