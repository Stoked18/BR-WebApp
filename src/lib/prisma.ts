import { PrismaClient } from '@prisma/client';

// Im Entwicklungsbetrieb laedt Next.js Module mehrfach; ohne Zwischenspeicher
// entstuenden bei jedem Hot Reload neue Verbindungspools.
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global_.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global_.prisma = prisma;
