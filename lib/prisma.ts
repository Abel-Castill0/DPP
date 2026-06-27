import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Only instantiate when DATABASE_URL is available — data functions check this before calling prisma
export const prisma: PrismaClient = process.env.DATABASE_URL
  ? (globalForPrisma.prisma ?? createPrismaClient())
  : (null as unknown as PrismaClient)

if (process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
