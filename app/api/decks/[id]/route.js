import { NextResponse } from "next/server";
import { deleteDeckRecord, regenerateShareToken, updateDeckRecord } from "../../../../lib/db";
import { isAdminRequest } from "../../../../lib/auth";
import { deleteDeckBlob } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deck = await deleteDeckRecord(id);
  if (!deck) {
    return NextResponse.json({ error: "Deck no encontrado." }, { status: 404 });
  }

  await deleteDeckBlob(deck);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const action = payload.action;

  if (action === "regenerate-link") {
    const deck = await regenerateShareToken(id);
    return deck
      ? NextResponse.json(deck)
      : NextResponse.json({ error: "Deck no encontrado." }, { status: 404 });
  }

  const patch = { ...payload };
  delete patch.action;
  if (Object.hasOwn(patch, "title")) {
    patch.title = String(patch.title || "").trim();
    if (!patch.title) {
      return NextResponse.json({ error: "El nombre del deck no puede estar vacio." }, { status: 400 });
    }
  }

  if (action === "deactivate-link") {
    patch.linkStatus = "INACTIVE";
  }
  if (action === "activate-link") {
    patch.linkStatus = "ACTIVE";
  }
  if (action === "archive") {
    patch.linkStatus = "ARCHIVED";
  }

  const deck = await updateDeckRecord(id, patch);
  return deck
    ? NextResponse.json(deck)
    : NextResponse.json({ error: "Deck no encontrado." }, { status: 404 });
}
