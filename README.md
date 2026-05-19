# Vefy Deck Vault

Repositorio online para guardar, previsualizar y compartir decks HTML autocontenidos de Vefy.

## Arquitectura

- Next.js para la app y las rutas API.
- Vercel Blob para guardar los archivos `.html`.
- Postgres para guardar metadata: titulo, cliente, notas, URL del HTML, token compartible y fechas.
- Login simple para proteger el panel privado.
- Rutas publicas `/share/{token}` para enviar decks a clientes.

## Uso local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

Sin variables de entorno, la app usa `data/decks` como fallback local. En Vercel hay que configurar storage real.

## Variables de entorno

Copiar `.env.example` a `.env.local` para desarrollo:

```text
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
ADMIN_PASSWORD=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deploy en Vercel

1. Crear un proyecto en Vercel desde este repositorio.
2. Crear un Blob Store y conectarlo al proyecto.
3. Crear Postgres desde Vercel Marketplace, por ejemplo Neon o Supabase, y conectarlo al proyecto.
4. Agregar `ADMIN_PASSWORD` y `AUTH_SECRET` como variables de entorno.
5. Deploy.

La tabla `decks` se crea automaticamente cuando la app usa la base por primera vez.
