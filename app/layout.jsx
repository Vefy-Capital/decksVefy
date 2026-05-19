import "./globals.css";

export const metadata = {
  title: "Vefy Deck Vault",
  description: "Repositorio privado de presentaciones HTML para Vefy."
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
