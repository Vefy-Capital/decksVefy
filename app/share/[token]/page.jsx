import { notFound } from "next/navigation";
import { getDeckByShareToken } from "../../../lib/db";

export default async function SharePage({ params }) {
  const { token } = await params;
  const deck = await getDeckByShareToken(token);
  if (!deck) notFound();

  return (
    <main className="viewer-body">
      <header className="viewer-bar">
        <a className="brand-mark compact" href="/" aria-label="Vefy">
          <span className="kV">V</span><span className="ke">e</span><span className="kf">f</span><span className="ky">y</span>
        </a>
        <div className="viewer-title">
          <span>{deck.title}</span>
          <small>{deck.client || "Deck"}</small>
        </div>
      </header>
      <section className="share-shell">
        <iframe className="deck-frame" src={`/api/share/${encodeURIComponent(token)}/content`} title={deck.title} />
      </section>
    </main>
  );
}
