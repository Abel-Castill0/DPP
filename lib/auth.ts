import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { type NextRequest } from "next/server"

export const COOKIE_NAME = "dpp-session"
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters")
  }
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  sub: string   // userId
  email: string
  role: string
  name: string
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      name: (payload.name as string) || (payload.email as string),
    }
  } catch {
    return null
  }
}

// Server component / server action: read session from cookie store
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// API route / middleware: read session from NextRequest
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export function cookieOptions(clear = false) {
  return {
    name: COOKIE_NAME,
    value: clear ? "" : undefined,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: clear ? 0 : COOKIE_MAX_AGE,
  }
}
