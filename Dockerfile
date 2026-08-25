# Mehrstufiger Bau, damit im Betriebsabbild weder Quelltext noch Bauwerkzeuge liegen.

FROM node:22-bookworm-slim AS abhaengigkeiten
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# Ein einziger Lauf mit allen Abhaengigkeiten. Frueher stand hier zusaetzlich
# ein "npm ci --omit=dev && cp -R node_modules /produktiv_module": dieser
# Produktivbaum wurde von keiner spaeteren Stufe je uebernommen (kein COPY
# --from darauf) und war reine Verschwendung – zwei vollstaendige Installationen
# und ein Kopiervorgang ueber ein Gigabyte. Gebraucht werden die vollen
# Abhaengigkeiten ohnehin, weil die Bau-Stufe damit uebersetzt; was zur Laufzeit
# noetig ist, buendelt der Standalone-Build selbst.
RUN npm ci

FROM node:22-bookworm-slim AS bau
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=abhaengigkeiten /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# public/ anlegen, falls es fehlt. Git verfolgt keine leeren Verzeichnisse:
# enthaelt public/ einmal keine Datei mehr, fehlt es im Clone, und der COPY in
# der Betriebsstufe bricht den Bau ab mit
#   failed to compute cache key: "/app/public": not found
# Ein mkdir hier macht den Bau davon unabhaengig.
RUN mkdir -p public && npx prisma generate && npx next build

FROM node:22-bookworm-slim AS betrieb
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 brcockpit \
    && useradd --system --uid 1001 --gid brcockpit brcockpit

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

# HOSTNAME muss ausdruecklich gesetzt werden.
#
# Der von Next.js erzeugte server.js liest `process.env.HOSTNAME || '0.0.0.0'`
# und uebergibt den Wert an listen(). Docker setzt HOSTNAME im Container aber
# von sich aus auf die Container-Kennung (z. B. "a1b2c3d4e5f6"). Ohne die
# folgende Zeile lauscht der Dienst deshalb nur auf der Container-Adresse:
# 127.0.0.1 im Container ist dann tot, die HEALTHCHECK unten schlaegt dauerhaft
# fehl und der Container gilt als "unhealthy", je nach Netztreiber ist er auch
# von aussen nicht erreichbar.
ENV HOSTNAME=0.0.0.0

# Der Standalone-Build enthaelt bereits alles, was zur Laufzeit gebraucht wird:
# den Prisma-Client samt Abfrage-Engine und das native argon2-Modul. Die
# Prisma-Befehlszeile gehoert bewusst NICHT hierher – sie zieht weitere
# Abhaengigkeiten nach sich (u. a. "effect"), die im schlanken Abbild fehlen
# wuerden. Die Migrationen laufen deshalb in einem eigenen Dienst, siehe
# docker-compose.yml.
# Eigentuemer gleich beim Kopieren setzen. Ein nachtraegliches
# "chown -R ... /app" wuerde jede Datei erneut schreiben und damit eine zweite
# vollstaendige Schicht ueber den rund 105 MB des Standalone-Bundles anlegen –
# das Abbild waere ohne jeden Gegenwert etwa ein Drittel groesser.
COPY --from=bau --chown=brcockpit:brcockpit /app/public ./public
COPY --from=bau --chown=brcockpit:brcockpit /app/.next/standalone ./
COPY --from=bau --chown=brcockpit:brcockpit /app/.next/static ./.next/static

RUN mkdir -p /var/lib/br-cockpit/data && chown brcockpit:brcockpit /var/lib/br-cockpit /var/lib/br-cockpit/data

USER brcockpit
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/anmeldung').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
