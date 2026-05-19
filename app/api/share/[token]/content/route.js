import { getDeckByShareToken, isShareable, recordDeckView } from "../../../../../lib/db";
import { readLocalDeckHtml } from "../../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { token } = await params;
  const deck = await getDeckByShareToken(token);
  if (!deck) {
    return new Response("Deck no encontrado", { status: 404 });
  }
  if (!isShareable(deck)) {
    return new Response("Link inactivo", { status: 403 });
  }

  await recordDeckView(deck);

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
