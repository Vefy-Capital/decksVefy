"use client";

import { useEffect, useMemo, useState } from "react";

const LINK_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"];

function slugify(value) {
  return String(value || "deck")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "deck";
}

function deckUrl(deck) {
  return `${window.location.origin}/share/${encodeURIComponent(slugify(deck.title))}/${encodeURIComponent(deck.shareToken || deck.id)}`;
}

function titleFromFile(fileName) {
  return String(fileName || "")
    .replace(/\.html?$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBytes(bytes) {
  if (!bytes) return "HTML";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "NO DATE";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value)).toUpperCase();
}

function relativeTime(value) {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.round(diff / 1000 / 60 / 60);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function linkClass(value) {
  return `chip link-${String(value || "").toLowerCase()}`;
}

export default function DeckVaultClient({ initialDecks = [] }) {
  const [decks, setDecks] = useState(initialDecks);
  const [selectedId, setSelectedId] = useState(initialDecks[0]?.id || null);
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState("ALL");
  const [fileName, setFileName] = useState("Arrastra un HTML o selecciona un archivo");
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const selectedDeck = decks.find((deck) => deck.id === selectedId) || null;
  const deckCountLabel = `${decks.length} ${decks.length === 1 ? "DECK" : "DECKS"}`;

  const filteredDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return decks.filter((deck) => {
      const matchesQuery = !needle || [deck.title, deck.client].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      );
      return matchesQuery && (linkFilter === "ALL" || deck.linkStatus === linkFilter);
    });
  }, [decks, linkFilter, query]);

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

  async function patchDeck(deck, patch) {
    const response = await fetch(`/api/decks/${encodeURIComponent(deck.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      showToast("No se pudo guardar");
      return null;
    }
    const updated = await response.json();
    setDecks((current) => current.map((item) => item.id === updated.id ? updated : item));
    return updated;
  }

  async function copyDeckLink(deck) {
    if (deck.linkStatus !== "ACTIVE") {
      showToast("Link inactivo");
      return;
    }
    await navigator.clipboard.writeText(deckUrl(deck));
    showToast("Link copiado");
  }

  async function deleteDeck(deck) {
    const confirmed = window.confirm(`Eliminar "${deck.title}" del vault?`);
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
    if (!String(data.get("title") || "").trim()) {
      data.set("title", titleFromFile(file.name));
    }

    setBusy(true);
    const response = await fetch("/api/decks", { method: "POST", body: data });
    setBusy(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast(payload.error || "No se pudo importar");
      return;
    }

    const deck = await response.json();
    form.reset();
    setTitle("");
    setFileName("Arrastra un HTML o selecciona un archivo");
    setSelectedId(deck.id);
    await loadDecks();
    showToast("Deck subido");
  }

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    setActionsOpen(false);
  }, [selectedDeck?.id]);

  return (
    <>
      <header className="app-header">
        <a className="brand-mark" href="/" aria-label="Vefy">
          <span className="kV">V</span><span className="ke">e</span><span className="kf">f</span><span className="ky">y</span>
        </a>
        <div className="header-meta">
          <span>PRIVATE ACCESS</span>
          <span>DECK VAULT · {deckCountLabel}</span>
          <form action="/api/logout" method="post">
            <button className="header-logout" type="submit">Cerrar sesion</button>
          </form>
        </div>
      </header>

      <main className="app-shell">
        <section className="intro-panel">
          <div className="hero-media">
            <img src="/vefy-billboard.png" alt="Vefy billboard" />
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
                  if (!file) {
                    setFileName("Arrastra un HTML o selecciona un archivo");
                    return;
                  }
                  setFileName(file.name);
                  setTitle((current) => current || titleFromFile(file.name));
                }}
              />
              <span className="file-label">UPLOAD HTML</span>
              <strong>{fileName}</strong>
              <small>FORMAT · HTML ONLY</small>
            </label>
            <label>
              <span>Nombre del deck</span>
              <input name="title" type="text" placeholder="Se completa con el nombre del archivo" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span>Cliente</span>
              <input name="client" type="text" placeholder="Cliente o cuenta" />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {busy ? "Subiendo" : "Subir deck"}
            </button>
          </form>
        </section>

        <section className="toolbar" aria-label="Filtros de biblioteca">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Buscar por titulo o cliente" />
          </label>
          <div className="filter-row compact-filters">
            <Filter value={linkFilter} options={LINK_FILTERS} onChange={setLinkFilter} />
          </div>
        </section>

        <section className="content-grid">
          <div className="deck-list" aria-live="polite">
            {!filteredDecks.length ? (
              <div className="empty-preview vault-empty">
                <p className="eyebrow">Vault empty</p>
                <h2>Todavia no hay decks en el vault.</h2>
                <p>Subi un HTML para crear una version privada y compartible.</p>
                <button className="primary-button" type="button" onClick={() => document.getElementById("deckFile")?.click()}>Subir primer deck</button>
              </div>
            ) : null}
            {filteredDecks.map((deck) => (
              <article className={`deck-row ${deck.id === selectedId ? "active" : ""}`} key={deck.id}>
                <button className="deck-main" type="button" onClick={() => setSelectedId(deck.id)}>
                  <span className="deck-title">{deck.title}</span>
                  <span className="deck-client">{deck.client || "Sin cliente asignado"}</span>
                  <span className="deck-meta-line">{formatDate(deck.updatedAt)} · {formatBytes(deck.size)}</span>
                  <span className="deck-meta-line">{deck.views || 0} VIEWS · LAST VIEWED {relativeTime(deck.lastViewedAt).toUpperCase()}</span>
                  <span className={linkClass(deck.linkStatus)}>LINK · {deck.linkStatus}</span>
                </button>
                <div className="deck-actions">
                  <a className="icon-button open-link" href={`/share/${encodeURIComponent(slugify(deck.title))}/${encodeURIComponent(deck.shareToken || deck.id)}`} target="_blank" rel="noreferrer" aria-label="Abrir deck" title="Abrir deck">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg>
                  </a>
                  <button className="icon-button share-button" type="button" aria-label="Copiar link" title="Copiar link" onClick={() => copyDeckLink(deck)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>
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
                  <div>
                    <h2>{selectedDeck.title}</h2>
                    <div className="preview-meta">
                      <span className={linkClass(selectedDeck.linkStatus)}>LINK · {selectedDeck.linkStatus}</span>
                      <span>{formatBytes(selectedDeck.size)}</span>
                      <span>{formatDate(selectedDeck.updatedAt)}</span>
                    </div>
                    {selectedDeck.linkStatus !== "ACTIVE" ? (
                      <p className="link-warning">El link no esta activo. Reactivalo para volver a compartir este deck.</p>
                    ) : null}
                  </div>
                  <div className="preview-actions">
                    <button className="primary-button" type="button" onClick={() => copyDeckLink(selectedDeck)} disabled={selectedDeck.linkStatus !== "ACTIVE"}>Copiar link</button>
                    <a className="ghost-button" href={`/share/${encodeURIComponent(slugify(selectedDeck.title))}/${encodeURIComponent(selectedDeck.shareToken || selectedDeck.id)}`} target="_blank" rel="noreferrer">Abrir</a>
                    <div className="menu-wrap">
                      <button className="icon-button" type="button" aria-label="Mas acciones" title="Mas acciones" onClick={() => setActionsOpen((value) => !value)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01"/><path d="M12 12h.01"/><path d="M19 12h.01"/></svg>
                      </button>
                      {actionsOpen ? (
                        <div className="action-menu">
                          <button type="button" onClick={() => patchDeck(selectedDeck, { action: "deactivate-link" })}>Desactivar link</button>
                          <button type="button" onClick={() => patchDeck(selectedDeck, { action: "activate-link" })}>Activar link</button>
                          <button type="button" onClick={() => deleteDeck(selectedDeck)}>Eliminar</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="preview-frame-wrap">
                  <iframe className="deck-frame" src={`/api/decks/${encodeURIComponent(selectedDeck.id)}/content`} title={selectedDeck.title} />
                </div>
                <section className="deck-dashboard">
                  <p className="eyebrow">Deck dashboard</p>
                  <div className="metric-grid">
                    <div><span>{selectedDeck.views || 0}</span><small>Total views</small></div>
                    <div><span>{relativeTime(selectedDeck.lastViewedAt)}</span><small>Last viewed</small></div>
                    <div><span>{selectedDeck.linkStatus}</span><small>Link status</small></div>
                  </div>
                </section>
              </div>
            )}
          </aside>
        </section>
      </main>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

function Filter({ value, options, onChange }) {
  return (
    <label className="select-filter">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
