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
      // Browsers nicht auf dieser Liste steht – ein CSRF-Schutz. Beim
      // Ausprobieren ueber GitHub Codespaces kommt die Anfrage ueber eine
      // externe *.app.github.dev-Domain herein, die sich von der Adresse
      // unterscheidet, an der Next.js intern lauscht; ohne diesen Eintrag
      // scheitert schon die Anmeldung. Fuer den eigenen Produktivnamen hinter
      // einem Reverse Proxy die Umgebungsvariable
      // ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE setzen (siehe .env.example).
      allowedOrigins: ['*.app.github.dev', ...zusaetzlicheUrsprungsAdressen],
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
