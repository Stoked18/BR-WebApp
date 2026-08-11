# Mehrstufiger Bau, damit im Betriebsabbild weder Quelltext noch Bauwerkzeuge liegen.

FROM node:22-bookworm-slim AS abhaengigkeiten
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && cp -R node_modules /produktiv_module && npm ci

FROM node:22-bookworm-slim AS bau
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=abhaengigkeiten /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS betrieb
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 brcockpit \
    && useradd --system --uid 1001 --gid brcockpit brcockpit

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

# Der Standalone-Build enthaelt bereits alles, was zur Laufzeit gebraucht wird:
# den Prisma-Client samt Abfrage-Engine und das native argon2-Modul. Die
# Prisma-Befehlszeile gehoert bewusst NICHT hierher – sie zieht weitere
# Abhaengigkeiten nach sich (u. a. "effect"), die im schlanken Abbild fehlen
# wuerden. Die Migrationen laufen deshalb in einem eigenen Dienst, siehe
# docker-compose.yml.
COPY --from=bau /app/public ./public
COPY --from=bau /app/.next/standalone ./
COPY --from=bau /app/.next/static ./.next/static

RUN mkdir -p /var/lib/br-cockpit/data && chown -R brcockpit:brcockpit /var/lib/br-cockpit /app

USER brcockpit
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/anmeldung').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
