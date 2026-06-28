# Fase 7B.1 — Diagnóstico de autenticación real y middleware

Fecha de diagnóstico: 2026-06-28  
Rama: `main`  
Commit base: `a21e12a`  
Estado: DIAGNÓSTICO COMPLETADO — sin cambios de código

---

## 1. Estado actual confirmado (evidencia real)

### Archivos auditados

| Archivo | Hallazgo |
|---------|---------|
| `middleware.ts` | NO EXISTE — todas las rutas son públicas |
| `app/login/page.tsx` | Placeholder visual — `onClick={() => router.push("/dashboard")}` — sin validación |
| `app/(app)/layout.tsx` | Agrupa rutas protegidas pero sin ningún check de auth |
| `app/layout.tsx` | Root layout sin auth |
| `lib/prisma.ts` | Solo gestión de DB — sin helpers de sesión/cookie |
| `lib/` (completo) | Sin ningún helper de auth, session, cookie o JWT |
| `package.json` | Sin NextAuth, sin @supabase/supabase-js, sin auth library alguna |
| `prisma/schema.prisma` | `User` con `passwordHash`, `UserRole` (6 roles), `AuditLog` con `LOGIN`/`LOGOUT` |
| `.env.example` | `NEXTAUTH_SECRET` comentado — fue considerado, no implementado |

### Variables de entorno detectadas (nombres solamente)

- `DATABASE_URL` — server-side, pooler Supabase
- `DIRECT_URL` — server-side, conexión directa
- `NEXT_PUBLIC_SUPABASE_URL` — presente en Vercel
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — presente en Vercel
- `SUPABASE_SERVICE_ROLE_KEY` — server-side, presente en Vercel
- `NEXT_PUBLIC_APP_URL` — presente en .env.example

### Build / Lint

| Check | Resultado |
|-------|-----------|
| `npm run lint` | ✓ 0 errores |
| `npm run build` | ✓ 0 errores — 15 rutas (7 dinámicas ƒ, 8 estáticas ○) |

---

## 2. Estado real de auth

| Componente | Estado |
|-----------|--------|
| `middleware.ts` | ❌ No existe |
| Supabase Auth (supabase-js) | ❌ No instalado — env vars presentes pero sin SDK |
| NextAuth / Auth.js | ❌ No instalado |
| Tabla `users` en Prisma | ✅ Existe — con `email`, `passwordHash`, `role`, `isActive` |
| Tabla `AuditLog` | ✅ Existe — con `LOGIN`, `LOGOUT` actions |
| Cookie/session helper | ❌ No existe |
| Login real | ❌ Solo `router.push("/dashboard")` — sin verificación |
| Páginas internas | ❌ Todas públicas — accesibles sin autenticación |
| APIs financieras | ❌ Todas públicas — `/api/reports/export*` sin auth |
| Roles definidos | ✅ En schema — ADMIN, GERENCIA, FINANZAS, PRODUCCION, COMPRAS, SOLO_LECTURA |

---

## 3. Matriz de rutas a proteger

| Ruta / API | Tipo de dato | Estado actual | Riesgo | Protección recomendada |
|------------|-------------|---------------|--------|----------------------|
| `/dashboard` | KPIs financieros, movimientos agregados | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/reports` | Reportes gerenciales completos | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/cash-flow` | Movimientos de caja (montos, bancos) | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/purchase-orders` | Órdenes de compra con montos y proveedores | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/service-orders` | Órdenes de servicio con montos y talleres | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/suppliers` | Datos de proveedores (RUC, cuentas bancarias) | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/items` | Catálogo de insumos | ❌ Pública | MEDIO | middleware → redirigir a `/login` |
| `/cash-flow/new` | Formulario nuevo movimiento | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/purchase-orders/new` | Formulario nueva OC | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/service-orders/new` | Formulario nueva OS | ❌ Pública | ALTO | middleware → redirigir a `/login` |
| `/suppliers/new` | Formulario nuevo proveedor | ❌ Pública | MEDIO | middleware → redirigir a `/login` |
| `/items/new` | Formulario nuevo insumo | ❌ Pública | MEDIO | middleware → redirigir a `/login` |
| `/settings` | Configuración | ❌ Pública | BAJO | middleware → redirigir a `/login` |
| `/imports` | Importación de datos | ❌ Pública | MEDIO | middleware → redirigir a `/login` |
| `/api/reports/export` | Excel completo datos financieros | ❌ Pública | CRÍTICO | verificar cookie en route handler |
| `/api/reports/export-pdf` | PDF completo datos financieros | ❌ Pública | CRÍTICO | verificar cookie en route handler |
| `/login` | Formulario de acceso | Pública | — | mantener pública |

**Rutas a dejar siempre públicas:** `/login`, `/_next/**`, `/favicon.ico`, `/api/auth/**`

---

## 4. Comparación de opciones

### Opción A — Supabase Auth

| Criterio | Evaluación |
|---------|-----------|
| Compatibilidad actual | BAJA — env vars presentes pero SDK no instalado; `User.passwordHash` en Prisma crea dos fuentes de verdad (Supabase `auth.users` vs Prisma `users`) |
| Esfuerzo | ALTO — instalar `@supabase/supabase-js` + `@supabase/ssr`, migrar gestión de usuarios, sincronizar ambas tablas |
| Riesgo de romper producción | ALTO — referencias `createdById`, `responsibleId` en `CashMovement`, `PurchaseOrder`, `ServiceOrder` apuntan a Prisma `users.id` |
| Seguridad | Buena — JWT gestionado por Supabase, refresh automático |
| Facilidad para Vercel | Buena — env vars ya presentes |
| Nuevas tablas / migraciones | SÍ — necesita reconciliar Supabase `auth.users` con Prisma `users` |
| Middleware | Compatible con `@supabase/ssr` + `createMiddlewareClient` |
| Usuario único/admin | Excesivo para un solo admin |
| Escalabilidad futura | Alta — OAuth providers, magic links, MFA disponibles |

### Opción B — NextAuth / Auth.js

| Criterio | Evaluación |
|---------|-----------|
| Compatibilidad actual | MEDIA — `.env.example` tenía `NEXTAUTH_SECRET` comentado (fue considerado); Credentials provider compatible con `User.passwordHash` |
| Esfuerzo | MEDIO — instalar `next-auth`, configurar Credentials provider, ajustar sesión |
| Riesgo de romper producción | MEDIO — con estrategia JWT (sin Prisma adapter) no necesita nuevas tablas |
| Seguridad | Buena — sesión cifrada, CSRF integrado |
| Facilidad para Vercel | Buena — `NEXTAUTH_URL` + `NEXTAUTH_SECRET` en env |
| Nuevas tablas / migraciones | NO con estrategia JWT — SÍ si se usa Prisma adapter |
| Middleware | `withAuth` de NextAuth en `middleware.ts` |
| Usuario único/admin | OK — Credentials provider funciona bien |
| Escalabilidad futura | Alta — OAuth providers disponibles |

### Opción C — Auth simple interna (httpOnly cookie + JWT)

| Criterio | Evaluación |
|---------|-----------|
| Compatibilidad actual | ALTA — usa directamente `User.passwordHash` y `UserRole` del schema Prisma existente |
| Esfuerzo | BAJO — `middleware.ts` + `api/auth/login` + `api/auth/logout` + update login + 1 helper |
| Riesgo de romper producción | BAJO — no toca lógica de datos, Excel, PDF ni estructura de DB |
| Seguridad | Buena para uso interno — httpOnly + Secure + SameSite=Strict + JWT firmado |
| Facilidad para Vercel | Excelente — `middleware.ts` corre en Edge runtime, compatible con Vercel |
| Nuevas tablas / migraciones | NO — usa `users` table existente |
| Middleware | Propio — simple verificación de cookie JWT |
| Usuario único/admin | Perfecto — mínimo overhead |
| Escalabilidad futura | Limitada (sin OAuth, sin refresh automático) — suficiente para app interna corporativa |
| Dependencias nuevas | Solo `bcryptjs` + `@types/bcryptjs` + `jose` (JWT puro JS, Edge-compatible) |

---

## 5. Recomendación técnica

**→ Opción C: Auth simple interna con httpOnly cookie + JWT**

**Justificación:**
1. El schema ya diseñó este flujo: `User.passwordHash`, `UserRole` con 6 roles, `AuditLog` con `LOGIN`/`LOGOUT` — el modelo de datos está listo.
2. Mínimo blast radius: no toca lógica de datos, Excel/PDF intactos, sin nuevas migraciones.
3. Zero conflictos de fuente de verdad: un solo `users` table.
4. Edge-compatible: `middleware.ts` con `jose` funciona en Vercel Edge sin Node.js runtime.
5. Para una app corporativa interna con un admin, es la solución proporcionada al riesgo.

**Archivos a tocar:**

| Archivo | Acción |
|---------|--------|
| `middleware.ts` | CREAR — raíz del proyecto, Edge runtime |
| `app/api/auth/login/route.ts` | CREAR — POST: verificar bcrypt + emitir JWT cookie |
| `app/api/auth/logout/route.ts` | CREAR — POST: limpiar cookie |
| `lib/auth.ts` | CREAR — `verifySession()`, tipos de sesión |
| `app/login/page.tsx` | MODIFICAR — submit a `/api/auth/login` vía fetch |

**Variables de entorno requeridas:**

| Variable | Propósito | Donde |
|---------|-----------|-------|
| `AUTH_SECRET` | Firma JWT (mín. 32 chars random) | `.env.local` + Vercel env |

**Migración Prisma:** NO — la tabla `users` ya existe con `email` y `password_hash`.

**Nota importante:** Será necesario actualizar `password_hash` del usuario admin en producción vía SQL (no migration). Esto es un paso de setup, no una migración de schema.

**Protección de páginas:** `middleware.ts` intercepta todo excepto `/login`, `/_next/**`, `/favicon.ico`, `/api/auth/**` → redirige a `/login` si no hay cookie válida.

**Protección de APIs `/api/reports/export*`:** El middleware las cubre automáticamente al no estar en la lista pública. Si se necesita protección adicional, verificar `request.cookies` dentro del route handler.

**Login/logout:**
- Login: `POST /api/auth/login` → bcrypt verify → JWT signed con `AUTH_SECRET` → cookie httpOnly Secure SameSite=Strict, max-age 8h
- Logout: `POST /api/auth/logout` → limpiar cookie → redirect a `/login`

**Assets públicos no bloqueados:** el matcher del middleware excluye `/_next/static`, `/_next/image`, `favicon.ico` explícitamente.

**Excel/PDF no rotos:** middleware corre antes de los route handlers pero no modifica el response body — solo redirige si no hay sesión.

**Verificación producción:** después de deploy, probar: sin cookie → redirect a `/login`; con cookie válida → acceso normal; `/api/reports/export` sin cookie → redirect a `/login` (no 200).

---

## 6. Plan de implementación — Fase 7B.2

### Rama sugerida
`phase-7b-auth`

### Dependencias a agregar
```
npm install bcryptjs jose
npm install -D @types/bcryptjs
```

### Archivos a crear / modificar

```
middleware.ts                       ← NUEVO (raíz, Edge runtime)
lib/auth.ts                         ← NUEVO (verifySession, tipos)
app/api/auth/login/route.ts         ← NUEVO (POST login)
app/api/auth/logout/route.ts        ← NUEVO (POST logout)
app/login/page.tsx                  ← MODIFICAR (fetch /api/auth/login)
```

### Flujo de login

```
Usuario POST /api/auth/login {email, password}
  → findUnique user by email
  → bcrypt.compare(password, user.passwordHash)
  → si inválido: return 401 {error: "Credenciales inválidas"}
  → si válido: crear JWT {sub: user.id, role: user.role, email: user.email}
  → firmar con AUTH_SECRET (jose SignJWT, exp: 8h)
  → Set-Cookie: dpp-session=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/
  → return 200 {ok: true}

Login page:
  → fetch('/api/auth/login', {method:'POST', body: JSON.stringify({email, password})})
  → if 200 → router.push('/dashboard')
  → if 401 → mostrar error "Credenciales incorrectas"
```

### Middleware

```typescript
// middleware.ts — Edge runtime
import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server"

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)
const PUBLIC = ["/login", "/api/auth/"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get("dpp-session")?.value
  if (!token) return NextResponse.redirect(new URL("/login", req.url))

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL("/login", req.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

### Protección de APIs export

Las APIs `/api/reports/export` y `/api/reports/export-pdf` quedan cubiertas por el matcher del middleware. Si el token es inválido, el middleware redirige antes de que el route handler ejecute — devuelve HTML de login (no binario), lo cual es comportamiento correcto (el cliente no puede descargar sin sesión).

### Variables de entorno

| Variable | Dónde añadir |
|---------|-------------|
| `AUTH_SECRET` | `.env.local` (desarrollo) + Vercel dashboard (producción) — **nunca** en `.env` ni en git |

### Setup producción (una sola vez, no es migration)

Después de deploy, ejecutar vía Supabase SQL editor o psql:
```sql
-- Actualizar hash de contraseña del admin (hash generado localmente con bcrypt)
UPDATE users SET password_hash = '<bcrypt_hash>' WHERE email = '<admin_email>';
```
*(El hash se genera offline con bcryptjs — nunca se transmite la contraseña en texto plano)*

### Pruebas locales (pre-merge)

```
[ ] Sin cookie → GET /dashboard → redirect 307 a /login
[ ] Sin cookie → GET /api/reports/export → redirect 307 a /login
[ ] Sin cookie → GET /api/reports/export-pdf → redirect 307 a /login
[ ] POST /api/auth/login credenciales inválidas → 401
[ ] POST /api/auth/login credenciales válidas → 200 + cookie httpOnly
[ ] Con cookie válida → GET /dashboard → 200
[ ] Con cookie válida → GET /api/reports/export → 200 + magic bytes PK
[ ] POST /api/auth/logout → cookie eliminada → redirect a /login
[ ] Cookie expirada → GET /dashboard → redirect 307 a /login
[ ] /_next/static/** → no redirigir (assets públicos)
[ ] /login → accesible sin cookie
```

### Pruebas producción (post-deploy)

```
[ ] Sin cookie → dpp-pink.vercel.app/dashboard → redirect a /login
[ ] Sin cookie → /api/reports/export → no descarga Excel
[ ] Login con credenciales correctas → acceso a dashboard
[ ] Login con credenciales incorrectas → error visible en UI
[ ] Logout → cookie eliminada → redirect a /login
[ ] 7/7 rutas protegidas redirigen sin cookie
[ ] 2/2 APIs export redirigen sin cookie
[ ] Rutas estáticas (_next) no bloqueadas
```

### Rollback plan

Si el deploy falla o produce errores inesperados:
1. Eliminar `middleware.ts` del branch
2. Hacer push → Vercel auto-deploya sin middleware → producción vuelve al estado anterior
3. Tiempo estimado de rollback: < 2 minutos

Rollback NO requiere tocar DB, ENV vars, ni lógica de negocio.

### Criterios de cierre de Fase 7B.2

- [ ] `middleware.ts` en Edge runtime — sin errores de build
- [ ] Login real funciona con credenciales de DB
- [ ] Logout limpia cookie
- [ ] `/dashboard` → redirect sin sesión
- [ ] `/api/reports/export` → redirect sin sesión (no 200 con datos)
- [ ] Cookie es httpOnly, Secure, SameSite=Strict
- [ ] `AUTH_SECRET` no en git
- [ ] Lint 0 errores
- [ ] Build 0 errores
- [ ] QA local completo (checklist arriba)
- [ ] QA producción completo
- [ ] Docs actualizados

---

## 7. Riesgos documentados

| ID | Riesgo | Severidad | Mitigación |
|----|--------|-----------|-----------|
| R01 | `users` table sin usuario admin con hash real en producción | ALTO | Setup SQL post-deploy antes de verificar login |
| R02 | `AUTH_SECRET` expuesto en git | CRÍTICO | Usar `.env.local` (ya en .gitignore) — nunca en `.env` |
| R03 | Middleware en Edge runtime — `jose` vs `jsonwebtoken` | MEDIO | Usar `jose` (puro JS, Edge-compatible) — nunca `jsonwebtoken` (Node.js only) |
| R04 | APIs de export devuelven redirect HTML (no error JSON) cuando sin sesión | BAJO | Comportamiento correcto — el cliente de descarga no puede usarlo sin sesión |
| R05 | `bcryptjs` en route handler Node.js (no Edge) | NINGUNO | `/api/auth/login` corre en Node.js runtime, no Edge — bcrypt compatible |

---

## 8. Checklist de verificación pre-implementación

```
[✅] middleware.ts NO existe actualmente — implementación limpia
[✅] User model tiene email + passwordHash — no necesita migration
[✅] UserRole enum definido — puede usarse en JWT payload
[✅] AuditLog tiene LOGIN/LOGOUT — puede registrarse al autenticar
[✅] app/(app)/ route group — facilita protección en bloque
[✅] .env.local en .gitignore — AUTH_SECRET seguro
[✅] jose compatible con Edge runtime — middleware funciona en Vercel
[✅] bcryptjs puro JS — funciona en Node.js route handler
[✅] Sin conflicto con Excel/PDF — middleware no modifica responses binarios
[✅] Rollback < 2 minutos — solo eliminar middleware.ts
```
