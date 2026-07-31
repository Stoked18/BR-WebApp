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

COPY --from=bau /app/public ./public
COPY --from=bau /app/.next/standalone ./
COPY --from=bau /app/.next/static ./.next/static
# Schema, Migrationen und Prisma-Werkzeuge fuer den Migrationslauf beim Start
COPY --from=bau /app/prisma ./prisma
COPY --from=bau /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=bau /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=bau /app/node_modules/prisma ./node_modules/prisma

RUN mkdir -p /var/lib/br-cockpit/data && chown -R brcockpit:brcockpit /var/lib/br-cockpit /app

USER brcockpit
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/anmeldung').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
