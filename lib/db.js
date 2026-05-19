import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { createShareToken } from "./ids";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "decks.json");

let sqlClient;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function sql() {
  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 1,
      prepare: false
    });
  }
  return sqlClient;
}

const deckColumns = sqlFragment => sqlFragment`
  id,
  title,
  client,
  notes,
  blob_url,
  blob_path,
  share_token,
  size_bytes,
  link_status,
  views,
  last_viewed_at,
  created_at,
  updated_at
`;

async function ensureLocalDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, "[]\n", "utf8");
  }
}

async function readLocalDecks() {
  await ensureLocalDb();
  const raw = await fs.readFile(DB_FILE, "utf8");
  let decks = [];
  try {
    decks = JSON.parse(raw.trim() || "[]");
  } catch {
    decks = [];
  }
  return decks.map((deck) => normalizeDeck(deck));
}

function normalizeDeck(deck) {
  const createdAt = deck.createdAt || deck.created_at || new Date().toISOString();
  const updatedAt = deck.updatedAt || deck.updated_at || createdAt;
  return {
    ...deck,
    blobUrl: deck.blobUrl || `/api/decks/${deck.id}/content`,
    blobPath: deck.blobPath || `decks/${deck.fileName || `${deck.id}.html`}`,
    shareToken: deck.shareToken || deck.id,
    size: deck.size || deck.size_bytes || 0,
    linkStatus: deck.linkStatus || deck.link_status || "ACTIVE",
    views: deck.views || 0,
    lastViewedAt: deck.lastViewedAt || deck.last_viewed_at ? new Date(deck.lastViewedAt || deck.last_viewed_at).toISOString() : null,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString()
  };
}

async function writeLocalDecks(decks) {
  await ensureLocalDb();
  await fs.writeFile(DB_FILE, `${JSON.stringify(decks, null, 2)}\n`, "utf8");
}

export async function ensureSchema() {
  if (!hasDatabase()) return;
  await sql()`create table if not exists decks (
    id text primary key,
    title text not null,
    client text default '',
    notes text default '',
    blob_url text not null,
    blob_path text not null,
    share_token text not null unique,
    size_bytes integer default 0,
    link_status text default 'ACTIVE',
    views integer default 0,
    last_viewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql()`alter table decks add column if not exists link_status text default 'ACTIVE'`;
  await sql()`alter table decks add column if not exists views integer default 0`;
  await sql()`alter table decks add column if not exists last_viewed_at timestamptz`;
}

function mapRow(row) {
  return normalizeDeck({
    id: row.id,
    title: row.title,
    client: row.client || "",
    notes: row.notes || "",
    blobUrl: row.blob_url,
    blobPath: row.blob_path,
    shareToken: row.share_token,
    size: row.size_bytes || 0,
    linkStatus: row.link_status,
    views: row.views,
    lastViewedAt: row.last_viewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export async function listDecks() {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  await ensureSchema();
  const rows = await sql()`select ${deckColumns(sql())} from decks order by updated_at desc`;
  return rows.map(mapRow);
}

export async function createDeckRecord(deck) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    decks.push(deck);
    await writeLocalDecks(decks);
    return deck;
  }

  await ensureSchema();
  const rows = await sql()`
    insert into decks (id, title, client, notes, blob_url, blob_path, share_token, size_bytes, link_status, views, created_at, updated_at)
    values (${deck.id}, ${deck.title}, ${deck.client}, ${deck.notes}, ${deck.blobUrl}, ${deck.blobPath}, ${deck.shareToken}, ${deck.size}, ${deck.linkStatus}, ${deck.views || 0}, ${deck.createdAt}, ${deck.updatedAt})
    returning ${deckColumns(sql())}
  `;
  return mapRow(rows[0]);
}

export async function updateDeckRecord(id, patch) {
  const now = new Date().toISOString();
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    let updated = null;
    const nextDecks = decks.map((deck) => {
      if (deck.id !== id) return deck;
      updated = normalizeDeck({ ...deck, ...patch, updatedAt: now });
      return updated;
    });
    await writeLocalDecks(nextDecks);
    return updated;
  }

  await ensureSchema();
  const current = await getDeckById(id);
  if (!current) return null;
  const next = normalizeDeck({ ...current, ...patch, updatedAt: now });
  const rows = await sql()`
    update decks set
      title = ${next.title},
      client = ${next.client},
      notes = ${next.notes},
      link_status = ${next.linkStatus},
      share_token = ${next.shareToken},
      views = ${next.views},
      last_viewed_at = ${next.lastViewedAt},
      updated_at = ${now}
    where id = ${id}
    returning ${deckColumns(sql())}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDeckById(id) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.find((deck) => deck.id === id) || null;
  }

  await ensureSchema();
  const rows = await sql()`select ${deckColumns(sql())} from decks where id = ${id} limit 1`;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDeckByShareToken(token) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.find((deck) => deck.shareToken === token || deck.id === token) || null;
  }

  await ensureSchema();
  const rows = await sql()`select ${deckColumns(sql())} from decks where share_token = ${token} limit 1`;
  return rows[0] ? mapRow(rows[0]) : null;
}

export function isShareable(deck) {
  if (!deck) return false;
  if (deck.linkStatus !== "ACTIVE") return false;
  return true;
}

export async function recordDeckView(deck) {
  if (!deck) return null;
  return updateDeckRecord(deck.id, {
    views: Number(deck.views || 0) + 1,
    lastViewedAt: new Date().toISOString()
  });
}

export async function regenerateShareToken(id) {
  return updateDeckRecord(id, {
    shareToken: createShareToken(),
    linkStatus: "ACTIVE"
  });
}

export async function deleteDeckRecord(id) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    const deck = decks.find((item) => item.id === id);
    await writeLocalDecks(decks.filter((item) => item.id !== id));
    return deck || null;
  }

  await ensureSchema();
  const rows = await sql()`delete from decks where id = ${id} returning ${deckColumns(sql())}`;
  return rows[0] ? mapRow(rows[0]) : null;
}
