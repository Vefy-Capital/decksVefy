"use client";

import { useEffect, useMemo, useState } from "react";

function deckUrl(deck) {
  return `${window.location.origin}/share/${encodeURIComponent(deck.shareToken || deck.id)}`;
}

function formatBytes(bytes) {
  if (!bytes) return "HTML";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default function DeckVaultClient() {
  const [decks, setDecks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [fileName, setFileName] = useState("Seleccionar deck");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedDeck = decks.find((deck) => deck.id === selectedId) || null;
  const filteredDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return decks;
    return decks.filter((deck) =>
      [deck.title, deck.client, deck.notes].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [decks, query]);

  async function loadDecks() {
    const response = await fetch("/api/decks", { cache: "no-store" });
    if (!response.ok) return;
    const nextDecks = await response.json();
    setDecks(nextDecks);
    setSelectedId((current) => current || nextDecks[0]?.id || null);
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  }

  async function copyDeckLink(deck) {
    await navigator.clipboard.writeText(deckUrl(deck));
    showToast("Link copiado");
  }

  async function deleteDeck(deck) {
    const confirmed = window.confirm(`Eliminar "${deck.title}" del repositorio?`);
    if (!confirmed) return;
    await fetch(`/api/decks/${encodeURIComponent(deck.id)}`, { method: "DELETE" });
    setSelectedId((current) => (current === deck.id ? null : current));
    await loadDecks();
    showToast("Deck eliminado");
  }

  async function importDeck(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("deckFile");
    if (!file || !file.name) return;

    setBusy(true);
    const response = await fetch("/api/decks", {
      method: "POST",
      body: data
    });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast(payload.error || "No se pudo importar");
      return;
    }

    const deck = await response.json();
    form.reset();
    setFileName("Seleccionar deck");
    setSelectedId(deck.id);
    await loadDecks();
    showToast("Deck importado");
  }

  useEffect(() => {
    loadDecks();
  }, []);

  return (
    <>
      <header className="app-header">
        <a className="brand-mark" href="/" aria-label="Vefy">
          <span className="kV">V</span><span className="ke">e</span><span className="kf">f</span><span className="ky">y</span>
        </a>
        <div className="header-meta">
          <span>Deck vault</span>
          <span>{decks.length} {decks.length === 1 ? "deck" : "decks"}</span>
        </div>
      </header>

      <main className="app-shell">
        <section className="intro-panel">
          <div>
            <p className="eyebrow">Private repository</p>
            <h1>Presentaciones listas para enviar, abrir y revisar en cualquier pantalla.</h1>
          </div>
          <form className="import-panel" onSubmit={importDeck}>
            <label className="file-drop" htmlFor="deckFile">
              <input
                id="deckFile"
                name="deckFile"
                type="file"
                accept=".html,text/html"
                required
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setFileName(file?.name || "Seleccionar deck");
                }}
              />
              <span className="file-label">Importar HTML</span>
              <strong>{fileName}</strong>
            </label>
            <div className="field-grid">
              <label>
                <span>Titulo</span>
                <input name="title" type="text" placeholder="Series A overview" />
              </label>
              <label>
                <span>Cliente</span>
                <input name="client" type="text" placeholder="Nombre o cuenta" />
              </label>
            </div>
            <label>
              <span>Notas internas</span>
              <textarea name="notes" rows="3" placeholder="Contexto, version o proximo paso" />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {busy ? "Importando" : "Agregar deck"}
            </button>
          </form>
        </section>

        <section className="toolbar" aria-label="Filtros de biblioteca">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Buscar por titulo, cliente o nota" />
          </label>
          <div className="view-toggle" role="group" aria-label="Modo de vista">
            <button className={`toggle-button ${previewMode === "desktop" ? "active" : ""}`} onClick={() => setPreviewMode("desktop")} type="button">Web</button>
            <button className={`toggle-button ${previewMode === "mobile" ? "active" : ""}`} onClick={() => setPreviewMode("mobile")} type="button">Mobile</button>
          </div>
        </section>

        <section className="content-grid">
          <div className="deck-list" aria-live="polite">
            {!filteredDecks.length ? (
              <div className="empty-preview">
                <p className="eyebrow">Library</p>
                <p>No hay decks para mostrar.</p>
              </div>
            ) : null}
            {filteredDecks.map((deck) => (
              <article className={`deck-row ${deck.id === selectedId ? "active" : ""}`} key={deck.id}>
                <button className="deck-main" type="button" onClick={() => setSelectedId(deck.id)}>
                  <span className="deck-title">{deck.title}</span>
                  <span className="deck-client">{deck.client || "Sin cliente asignado"}</span>
                  <span className="deck-notes">{formatDate(deck.updatedAt)} · {formatBytes(deck.size)}{deck.notes ? ` · ${deck.notes}` : ""}</span>
                </button>
                <div className="deck-actions">
                  <a className="icon-button open-link" href={`/share/${encodeURIComponent(deck.shareToken || deck.id)}`} target="_blank" rel="noreferrer" aria-label="Abrir deck" title="Abrir deck">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg>
                  </a>
                  <button className="icon-button share-button" type="button" aria-label="Copiar link" title="Copiar link" onClick={() => copyDeckLink(deck)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>
                  </button>
                  <button className="icon-button delete-button" type="button" aria-label="Eliminar deck" title="Eliminar deck" onClick={() => deleteDeck(deck)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12"/><path d="M9 7V5h6v2"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M7 7l1 14h8l1-14"/></svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="preview-pane">
            {!selectedDeck ? (
              <div className="empty-preview">
                <p className="eyebrow">Preview</p>
                <p>Selecciona un deck para verlo aca.</p>
              </div>
            ) : (
              <div className="preview-frame-shell">
                <div className="preview-topline">
                  <h2>{selectedDeck.title}</h2>
                  <button className="primary-button" type="button" onClick={() => copyDeckLink(selectedDeck)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>
                    Compartir
                  </button>
                </div>
                <div className={`preview-frame-wrap ${previewMode === "mobile" ? "mobile" : ""}`}>
                  <iframe className="deck-frame" src={`/api/decks/${encodeURIComponent(selectedDeck.id)}/content`} title={selectedDeck.title} />
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
