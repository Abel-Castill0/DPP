# Phase 7B — Autenticación interna real

**Estado:** ✅ Completado — en producción  
**Deploy:** `dpl_CgANQGfuuSLYAWmmFdD28zAR6nSY` — commit `d4df68e` — 2026-06-28

---

## Objetivo

Reemplazar el placeholder de login (`router.push("/dashboard")` sin verificación) por autenticación real:
- Credenciales verificadas contra `User.passwordHash` en la BD
- Sesión con httpOnly cookie + JWT (HS256, 8h)
- Proxy Edge protegiendo todas las rutas internas
- AuditLog de LOGIN y LOGOUT

La decisión fue implementar auth interna (Option C) en lugar de Supabase Auth o NextAuth, porque el esquema ya tenía `User.passwordHash` + `UserRole` + `AuditLog`, y esta opción tiene el menor blast radius para el MVP.

---

## Archivos creados / modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `proxy.ts` | CREADO | Next.js 16 Edge proxy — protege todas las rutas excepto `/login`, `/api/auth/`, assets |
| `lib/auth.ts` | CREADO | JWT helpers con `jose` — `createSessionToken`, `verifySessionToken`, `getSession`, `cookieOptions` |
| `app/api/auth/login/route.ts` | CREADO | POST — bcrypt verify + AuditLog LOGIN + cookie httpOnly |
| `app/api/auth/logout/route.ts` | CREADO | POST — AuditLog LOGOUT + limpiar cookie |
| `app/login/page.tsx` | MODIFICADO | Form real → POST `/api/auth/login`, muestra errores, redirige en 200 |
| `scripts/create-admin-user.ts` | CREADO | Script seguro para crear/upsert admin — lee `ADMIN_EMAIL`/`ADMIN_PASSWORD` del entorno |
| `tsconfig.json` | MODIFICADO | `"scripts"` agregado a `exclude` |
| `.env.example` | MODIFICADO | Documenta `AUTH_SECRET` |
| `package.json` | MODIFICADO | Agrega `jose`, `bcryptjs`, `@types/bcryptjs` |

---

## Decisiones de diseño

### Proxy (Next.js 16)
Next.js 16 deprecó `middleware.ts` / export `middleware`. El nuevo archivo es `proxy.ts` con export named `proxy`. El matcher excluye `_next/static`, `_next/image`, `favicon.ico`, `.png`, `.svg`.

### JWT con `jose`
Se eligió `jose` (pure JS) en lugar de `jsonwebtoken` porque el proxy corre en Edge runtime, que no soporta Node.js modules. `jose` usa la Web Crypto API y es compatible con Edge.

### Timing attack protection
El endpoint de login usa un dummy hash cuando el usuario no existe, para que `bcrypt.compare` siempre tome el mismo tiempo independientemente de si el email existe o no.

```typescript
const dummyHash = "$2a$12$dummyhashfortimingprotectiononly000000000000000000000000"
const hashToCompare = user?.passwordHash ?? dummyHash
const valid = await bcrypt.compare(password, hashToCompare)
if (!user || !valid) {
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
}
```

### Cookie
- `dpp-session` — HttpOnly, Secure (prod), SameSite=lax, Path=/, Max-Age=28800 (8h)
- El JWT payload solo contiene `sub` (userId), `email`, `role` — nunca `passwordHash`

### AuditLog
Los registros de LOGIN/LOGOUT están envueltos en un try/catch interno separado (non-blocking): un fallo de audit no bloquea el login ni el logout.

---

## Secrets configurados

| Variable | Dónde | Estado |
|----------|-------|--------|
| `AUTH_SECRET` | Vercel (production + preview, encrypted) | ✅ Configurado — 64 hex chars, generado con `RNGCryptoServiceProvider` |
| `ADMIN_EMAIL` | Solo local / script — no en Vercel | ✅ `admin@dpp.pe` |
| `ADMIN_PASSWORD` | Solo local / script — no en Vercel | ✅ Rotación pendiente |

---

## Admin en producción

| Campo | Valor |
|-------|-------|
| Email | `admin@dpp.pe` |
| ID | `d153d49e-8f1c-4862-9225-8296943ea731` |
| Role | ADMIN |
| isActive | true |
| passwordHash | `$2b$12$...` (60 chars, bcrypt cost 12) |
| Creado | 2026-06-28 |

**Recomendación pendiente:** rotar la contraseña del admin. La contraseña usada durante el setup estuvo visible en la sesión de shell. Para rotar: ejecutar `scripts/create-admin-user.ts` con nuevas variables de entorno sin imprimir el valor.

---

## QA — Producción verificado

| Check | Resultado |
|-------|-----------|
| `/login` → 200 + form | ✅ |
| `/dashboard` sin sesión → `x-matched-path: /login` | ✅ |
| `/reports` sin sesión → `/login` | ✅ |
| `/cash-flow` sin sesión → `/login` | ✅ |
| `/purchase-orders` sin sesión → `/login` | ✅ |
| `/service-orders` sin sesión → `/login` | ✅ |
| `/suppliers` sin sesión → `/login` | ✅ |
| `/items` sin sesión → `/login` | ✅ |
| `/api/reports/export` sin sesión → 401 `{"error":"No autorizado."}` | ✅ |

---

## Git

| Commit | Descripción |
|--------|-------------|
| `23f31ee` | `feat: add internal authentication middleware` (rama `phase-7b-auth`) |
| `d4df68e` | `feat: add internal authentication middleware (Phase 7B)` (merge --no-ff a `main`) |

---

## Errores encontrados y resueltos durante desarrollo

1. **`middleware.ts` deprecado en Next.js 16** — Renombrado a `proxy.ts`, export `proxy` (no `middleware`)
2. **`withDb` no acepta argumento `db`** — El callback debe ser `() => Promise<T>` sin parámetros; usar `prisma` directamente
3. **`scripts/create-admin-user.ts` import PrismaClient** — Usar `require("../lib/generated/prisma/client")` (cliente generado, no `@prisma/client`)
4. **`RandomNumberGenerator.Fill` no disponible en PS 5.1** — Usar `RNGCryptoServiceProvider.GetBytes()`
5. **`.env.local` no cargado por `import "dotenv/config"`** — Cargar explícitamente con `dotenv.config({ path: ".env.local" })`
