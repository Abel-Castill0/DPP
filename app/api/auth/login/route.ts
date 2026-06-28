import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma, withDb } from "@/lib/prisma"
import { createSessionToken, cookieOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GENERIC_ERROR = "Credenciales incorrectas."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const user = await withDb(
      () => prisma.user.findUnique({ where: { email, isActive: true } }),
      null
    )

    // Constant-time comparison even when user not found (avoid timing attacks)
    const dummyHash = "$2a$12$dummyhashfortimingprotectiononly000000000000000000000000"
    const hashToCompare = user?.passwordHash ?? dummyHash
    const valid = await bcrypt.compare(password, hashToCompare)

    if (!user || !valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    // Log LOGIN action (non-blocking — failure must not block login)
    try {
      await withDb(
        () => prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
            ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
          },
        }),
        null
      )
    } catch { /* audit failure must not block login */ }

    const opts = cookieOptions()
    const response = NextResponse.json({ ok: true })
    response.cookies.set({ ...opts, value: token })
    return response
  } catch {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}
