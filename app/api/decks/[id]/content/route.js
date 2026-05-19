import { getDeckById } from "../../../../../lib/db";
import { isAdminRequest } from "../../../../../lib/auth";
import { readLocalDeckHtml } from "../../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  if (!(await isAdminRequest())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) {
    return new Response("Deck no encontrado", { status: 404 });
  }

  if (deck.blobUrl?.startsWith("http")) {
    const response = await fetch(deck.blobUrl, { cache: "no-store" });
    return new Response(await response.text(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  return new Response(await readLocalDeckHtml(deck.id), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
