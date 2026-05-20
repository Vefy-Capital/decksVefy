import { notFound } from "next/navigation";
import { getDeckByShareToken, isShareable } from "../../../lib/db";

function tokenFromParts(parts = []) {
  return parts[parts.length - 1];
}

function deckDescription(deck) {
  return deck.client
    ? `Deck privado de Vefy para ${deck.client}. Acceso web compartido.`
    : "Deck privado de Vefy. Acceso web compartido.";
}

export async function generateMetadata({ params }) {
  const { parts } = await params;
  const token = tokenFromParts(parts);
  const deck = await getDeckByShareToken(token);
  if (!deck) {
    return {
      title: "Vefy Deck",
      description: "Deck privado de Vefy."
    };
  }

  const description = deckDescription(deck);
  return {
    title: deck.title,
    description,
    openGraph: {
      title: deck.title,
      description,
      siteName: "Vefy",
      images: [{ url: "/og-vefy.png", width: 1200, height: 630, alt: "Vefy" }]
    },
    twitter: {
      card: "summary_large_image",
      title: deck.title,
      description,
      images: ["/og-vefy.png"]
    }
  };
}

export default async function SharePage({ params }) {
  const { parts } = await params;
  const token = tokenFromParts(parts);
  const deck = await getDeckByShareToken(token);
  if (!deck) notFound();
  const unavailable = !isShareable(deck);

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
        {unavailable ? (
          <div className="share-unavailable">
            <p className="eyebrow">Private access</p>
            <h1>Este deck ya no esta disponible.</h1>
          </div>
        ) : (
          <iframe className="deck-frame" src={`/api/share/${encodeURIComponent(token)}/content`} title={deck.title} />
        )}
      </section>
    </main>
  );
}
