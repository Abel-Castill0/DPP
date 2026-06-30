import { getSession } from "./auth"

type SessionOk = { userId: string; email: string; role: string; name: string }
type SessionErr = { error: string }

export async function requireUserId(): Promise<SessionOk | SessionErr> {
  const session = await getSession()
  if (!session?.sub) {
    return { error: "Sesión expirada. Vuelva a iniciar sesión." }
  }
  return {
    userId: session.sub,
    email: session.email,
    role: session.role,
    name: session.name,
  }
}
