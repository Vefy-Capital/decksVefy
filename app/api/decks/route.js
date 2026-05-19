import { NextResponse } from "next/server";
import { createDeckRecord, listDecks } from "../../../lib/db";
import { isAdminRequest } from "../../../lib/auth";
import { createId, createShareToken, normalizeDeckHtml } from "../../../lib/ids";
import { saveDeckHtml } from "../../../lib/storage";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listDecks());
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("deckFile");
    if (!file || typeof file.text !== "function") {
      return NextResponse.json({ error: "Falta el archivo HTML." }, { status: 400 });
    }

    const originalName = file.name || "deck.html";
    const title = String(form.get("title") || originalName.replace(/\.html?$/i, "")).trim();
    const html = normalizeDeckHtml(await file.text());
    if (!title || !html) {
      return NextResponse.json({ error: "Falta titulo o HTML." }, { status: 400 });
    }

    const id = createId(title);
    const now = new Date().toISOString();
    const stored = await saveDeckHtml({ id, html });
    const deck = await createDeckRecord({
      id,
      title,
      client: String(form.get("client") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
      blobUrl: stored.blobUrl,
      blobPath: stored.blobPath,
      shareToken: createShareToken(),
      linkStatus: "ACTIVE",
      views: 0,
      lastViewedAt: null,
      size: Buffer.byteLength(html, "utf8"),
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json(deck, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "No se pudo importar el deck." }, { status: 400 });
  }
}
