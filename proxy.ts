import { type NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"

// Routes accessible without a session
const PUBLIC_PREFIXES = ["/login", "/api/auth/"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and Next.js internals
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    // API routes → 401 JSON (not HTML redirect)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }
    // Page routes → redirect to login
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
}
