import { NextResponse } from "next/server";
import { deleteDeckRecord } from "../../../../lib/db";
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
