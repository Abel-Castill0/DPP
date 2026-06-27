import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!
  // Supabase requires SSL for external connections; rejectUnauthorized=false
  // avoids cert pinning issues in Vercel's serverless environment.
  const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined
  const adapter = new PrismaPg({ connectionString: url, ssl })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Only instantiate when DATABASE_URL is available.
// Data functions check this before calling prisma, so null is never dereferenced in demo mode.
export const prisma: PrismaClient = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ?? createPrismaClient())
  : (null as unknown as PrismaClient)

if (process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

/**
 * Safe DB query wrapper.
 * - No DATABASE_URL → demo fallback (build time, demo mode).
 * - DATABASE_URL set + query fails → warn in dev, throw in production runtime.
 *   Exception: Next.js build phase (NEXT_PHASE=phase-production-build) always falls back
 *   to demo so static prerendering can complete without a live DB.
 */
export async function withDb<T>(
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!process.env.DATABASE_URL) return fallback
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  try {
    return await query()
  } catch (e) {
    if (process.env.NODE_ENV === "production" && !isBuildPhase) throw e
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[DPP] DB query failed, using demo data:", msg.slice(0, 120))
    return fallback
  }
}
