import { type NextRequest, NextResponse } from "next/server"
import { prisma, withDb } from "@/lib/prisma"
import { getSessionFromRequest, cookieOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (session) {
      try {
        await withDb(
          () => prisma.auditLog.create({
            data: {
              userId: session.sub,
              action: "LOGOUT",
              entityType: "User",
              entityId: session.sub,
              ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
            },
          }),
          null
        )
      } catch { /* audit failure must not block logout */ }
    }

    const opts = cookieOptions(true)
    const response = NextResponse.json({ ok: true })
    response.cookies.set({ ...opts, value: "" })
    return response
  } catch {
    // Always clear cookie even on error
    const opts = cookieOptions(true)
    const response = NextResponse.json({ ok: true })
    response.cookies.set({ ...opts, value: "" })
    return response
  }
}
