# Vercel Deploy Status — DPP Control

**Última verificación:** 2026-06-27  
**Estado:** ✅ Preview verificado — listo para producción con confirmación

---

## Deploys registrados

| URL | Target | Estado | Fecha |
|-----|--------|--------|-------|
| `dpp-k5u5vk2cj-...vercel.app` | preview | ✅ READY | 2026-06-27 20:16 |
| `dpp-163owcspd-...vercel.app` | preview | ✅ READY | 2026-06-27 20:02 |
| `dpp-poj8ng4bs-...vercel.app` | production | ✅ READY | 2026-06-27 19:58 |

**Proyecto Vercel:** `prj_GMwUTB3OWKGAXoac1jiFAPwa1NeS`  
**Repo:** `https://github.com/Abel-Castill0/DPP.git` → rama `main`

---

## Resultado de verificación (2026-06-27)

### HTTP Status — preview `dpp-k5u5vk2cj-...vercel.app`

| Ruta | Status | Tamaño |
|------|--------|--------|
| `/` | ✅ 200 | ~211 KB |
| `/dashboard` | ✅ 200 | ~211 KB |
| `/suppliers` | ✅ 200 | ~211 KB |
| `/items` | ✅ 200 | ~211 KB |
| `/purchase-orders` | ✅ 200 | ~211 KB |
| `/service-orders` | ✅ 200 | ~211 KB |
| `/cash-flow` | ✅ 200 | ~211 KB |
| `/reports` | ✅ 200 | ~211 KB |

### Seguridad

| Check | Resultado |
|-------|-----------|
| Secretos expuestos en HTML | ✅ Ninguno |
| `DATABASE_URL` visible en página | ✅ No expuesto |
| `SUPABASE_SERVICE_ROLE_KEY` en cliente | ✅ No expuesto |
| Errores de aplicación en HTML | ✅ Ninguno |
| Errores 500 | ✅ Ninguno |

### Build logs

| Check | Resultado |
|-------|-----------|
| TypeScript errors | ✅ 0 |
| Build exitoso | ✅ Compiled in ~15s |
| Errores Prisma/DB en build | ✅ Ninguno (páginas dinámicas no conectan en build) |
| ENETUNREACH en build | ✅ Resuelto — ya no ocurre (páginas son `ƒ dynamic`) |

---

## Variables de entorno en Vercel

Configuradas para `production` y `preview`:

| Variable | Tipo | Notas |
|----------|------|-------|
| `DATABASE_URL` | sensitive | Pooler Supabase — `aws-0-us-east-1.pooler.supabase.com:6543` (IPv4) |
| `DIRECT_URL` | sensitive | Direct connection `db.[ref].supabase.co:5432` (para migraciones) |
| `NEXT_PUBLIC_SUPABASE_URL` | sensitive | URL pública Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sensitive | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sensitive | Solo server — nunca en cliente |

---

## Cambios aplicados para este deploy

### `export const dynamic = "force-dynamic"` en 6 páginas

**Problema:** Todas las páginas eran `○ (Static)` — se pre-generaban con demo data durante `next build` porque Supabase no es alcanzable en el entorno de build de Vercel (IPv6, `ENETUNREACH`).

**Solución:** Agregar `export const dynamic = "force-dynamic"` a:
- `app/(app)/dashboard/page.tsx`
- `app/(app)/suppliers/page.tsx`
- `app/(app)/items/page.tsx`
- `app/(app)/purchase-orders/page.tsx`
- `app/(app)/service-orders/page.tsx`
- `app/(app)/cash-flow/page.tsx`

**Resultado:** Ahora son `ƒ (Dynamic)` — se renderizan en cada request y consultan Supabase en runtime.

### `DATABASE_URL` actualizada en Vercel

**Problema:** La URL original apuntaba a `db.[ref].supabase.co:5432` (conexión directa, IPv6 en red Vercel).

**Solución:** Actualizada vía Vercel API a URL del transaction pooler:
`postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

El pooler usa IPv4 y es la URL recomendada por Supabase para entornos serverless como Vercel.

---

## Estado de Supabase

| Check | Resultado |
|-------|-----------|
| Proyecto activo | ✅ PostgreSQL 17.6 |
| Migración `init_phase2` | ✅ Aplicada |
| Tablas | ✅ 7 tablas, datos seed |
| Pooler `aws-0-us-east-1.pooler.supabase.com:6543` | ✅ REACHABLE |
| `DIRECT_URL` direct connection | ✅ REACHABLE |

---

## Para pasar a producción

**Antes de ejecutar `npx vercel --prod` confirma:**

- [ ] Has revisado el preview visualmente en el browser
- [ ] Los formularios funcionan (crear proveedor, ítem, OC, OS, movimiento)
- [ ] Los datos de Supabase aparecen en las páginas (no demo data)
- [ ] El dashboard muestra KPIs calculados desde BD real
- [ ] No hay errores en la consola del browser
- [ ] Las variables de entorno en Vercel son correctas (DATABASE_URL = pooler)

**Comando (ejecutar solo con confirmación):**
```bash
cd dpp-control
npx vercel --prod --token <VERCEL_TOKEN> --yes
```

O simplemente hacer merge/push a `main` si el proyecto está configurado con auto-deploy de producción en Vercel.

---

## Commits relacionados

| Commit | Descripción |
|--------|-------------|
| `188e2c8` | Scaffold DPP Control — fase 2 |
| `8ad00b3` | Phase 2.5 — CRUD, server actions |
| `a999715` | Connect Prisma to Supabase |
| `5ad16b7` | Migrations, seed, Playwright MCP |
| `f35c66e` | **Fix: dynamic pages + pooler URL** |
