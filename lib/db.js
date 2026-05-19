import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

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
      max: 1
    });
  }
  return sqlClient;
}

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
  return decks.map((deck) => ({
    ...deck,
    blobUrl: deck.blobUrl || `/api/decks/${deck.id}/content`,
    blobPath: deck.blobPath || `decks/${deck.fileName || `${deck.id}.html`}`,
    shareToken: deck.shareToken || deck.id,
    size: deck.size || deck.size_bytes || 0
  }));
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
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    client: row.client || "",
    notes: row.notes || "",
    blobUrl: row.blob_url,
    blobPath: row.blob_path,
    shareToken: row.share_token,
    size: row.size_bytes || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listDecks() {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  await ensureSchema();
  const rows = await sql()`select * from decks order by updated_at desc`;
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
    insert into decks (id, title, client, notes, blob_url, blob_path, share_token, size_bytes, created_at, updated_at)
    values (${deck.id}, ${deck.title}, ${deck.client}, ${deck.notes}, ${deck.blobUrl}, ${deck.blobPath}, ${deck.shareToken}, ${deck.size}, ${deck.createdAt}, ${deck.updatedAt})
    returning *
  `;
  return mapRow(rows[0]);
}

export async function getDeckById(id) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.find((deck) => deck.id === id) || null;
  }

  await ensureSchema();
  const rows = await sql()`select * from decks where id = ${id} limit 1`;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDeckByShareToken(token) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    return decks.find((deck) => deck.shareToken === token || deck.id === token) || null;
  }

  await ensureSchema();
  const rows = await sql()`select * from decks where share_token = ${token} limit 1`;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteDeckRecord(id) {
  if (!hasDatabase()) {
    const decks = await readLocalDecks();
    const deck = decks.find((item) => item.id === id);
    await writeLocalDecks(decks.filter((item) => item.id !== id));
    return deck || null;
  }

  await ensureSchema();
  const rows = await sql()`delete from decks where id = ${id} returning *`;
  return rows[0] ? mapRow(rows[0]) : null;
}
