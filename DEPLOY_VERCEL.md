# Deploy de Vefy Deck Vault en Vercel

## Lo que ya esta preparado

La app ya esta migrada a Next.js y lista para Vercel.

En produccion usa:

- Vercel Blob para guardar cada HTML autocontenido.
- Postgres para guardar metadata de cada deck.
- `ADMIN_PASSWORD` para proteger el panel privado.
- `/share/{token}` para links compartibles.

## Que necesito de vos

1. Cuenta de Vercel.
2. Decidir si el proyecto va a estar conectado a GitHub.
3. Crear o autorizar un Blob Store en Vercel.
4. Crear o autorizar una base Postgres desde Vercel Marketplace.
5. Definir un password de admin.
6. Definir un `AUTH_SECRET` largo y privado.

## Variables de entorno en Vercel

Agregar en Project Settings -> Environment Variables:

```text
DATABASE_URL=...
BLOB_READ_WRITE_TOKEN=...
ADMIN_PASSWORD=...
AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

Vercel normalmente inyecta `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN` cuando conectas Postgres y Blob al proyecto.

## Pasos en Vercel

1. Subir este proyecto a GitHub.
2. En Vercel, elegir "Add New Project".
3. Importar el repo.
4. Framework: Next.js.
5. Build command: `npm run build`.
6. Install command: `npm install`.
7. Output directory: dejar vacio.
8. Crear y conectar Blob Store.
9. Crear y conectar Postgres.
10. Agregar `ADMIN_PASSWORD`, `AUTH_SECRET` y `NEXT_PUBLIC_APP_URL`.
11. Deploy.

## Como se guarda un deck

Cuando importas un HTML:

1. La ruta `/api/decks` recibe el archivo.
2. El HTML se normaliza con viewport responsive.
3. El archivo se sube a Vercel Blob en `decks/{id}.html`.
4. Postgres guarda titulo, cliente, notas, URL de Blob y token publico.
5. El panel privado muestra la lista desde Postgres.
6. El link publico usa `/share/{token}`.

## Tabla Postgres

La app crea esta tabla automaticamente si no existe:

```sql
create table if not exists decks (
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
);
```

## Notas

- Los decks deben ser HTML autocontenidos.
- En local, si no hay variables de Vercel, la app usa `data/decks` como fallback.
- En produccion, no se usa disco local.
