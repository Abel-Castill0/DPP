import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? ""
  const hasDb = dbUrl.length > 0
  const host = dbUrl.match(/@([^/:]+)/)?.[1] ?? "none"
  const isSupabase = dbUrl.includes("supabase")
  const isPooler = dbUrl.includes("pooler")

  let dbStatus = "not_tested"
  let dbError = ""
  let supplierCount = 0

  if (hasDb) {
    try {
      const { prisma } = await import("@/lib/prisma")
      supplierCount = await prisma.supplier.count()
      dbStatus = "ok"
    } catch (e) {
      dbStatus = "error"
      const msg = e instanceof Error ? e.message : String(e)
      // Strip credentials from error message before returning
      dbError = msg.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***@").slice(0, 300)
    }
  }

  return NextResponse.json({
    hasDb,
    host,
    isSupabase,
    isPooler,
    dbStatus,
    dbError,
    supplierCount,
    nodeEnv: process.env.NODE_ENV,
  })
}
