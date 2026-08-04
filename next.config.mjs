// Zusaetzliche Herkunftsadressen fuer Server Actions (z. B. der eigene
// Produktivname hinter einem Reverse Proxy), kommagetrennt ueber die Umgebung.
const zusaetzlicheUrsprungsAdressen = (process.env.ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
      // Next.js lehnt Formularuebermittlungen (Server Actions) mit
      // "Invalid Server Actions request" ab, wenn die Herkunftsadresse des
      // Browsers (der Origin-Header) nicht zu einer bekannten Adresse passt –
      // ein CSRF-Schutz. Zwei Faelle treten bei GitHub Codespaces auf:
      //  1. Ein echter externer Browser-Tab auf der *.app.github.dev-Adresse,
      //     bei dem Origin und der von Codespaces gesetzte x-forwarded-host
      //     zwar uebereinstimmen sollten, es aber vereinzelt nicht tun.
      //  2. VS Codes eingebaute Portvorschau ("Preview in Editor"), die zwar
      //     durch denselben Tunnel geht (x-forwarded-host zeigt korrekt auf
      //     *.app.github.dev), deren eingebetteter Browser dem Next.js-Server
      //     als Origin aber "localhost:3000" meldet. Nachgewiesen anhand
      //     einer echten Fehlermeldung: "`x-forwarded-host` header with value
      //     `<name>.app.github.dev` does not match `origin` header with value
      //     `localhost:3000`". Fuer den eigenen Produktivnamen hinter einem
      //     Reverse Proxy die Umgebungsvariable
      //     ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE setzen (siehe .env.example).
      allowedOrigins: [
        '*.app.github.dev',
        'localhost:3000',
        '127.0.0.1:3000',
        ...zusaetzlicheUrsprungsAdressen,
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
