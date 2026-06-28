# Vercel Deploy Status — DPP Control

**Última verificación:** 2026-06-27 — Phase 3 deploy (vía Supabase MCP + QA script 27/27)  
**Estado:** ✅ Producción OK — Phase 3 activa, 7/7 rutas 200, OC/OS→Caja operativo

---

## Deploys registrados

| URL | Commit | Estado | Fecha |
|-----|--------|--------|-------|
| `dpp-pink.vercel.app` (producción) | `8e194e6` (latest) | ✅ READY + aliased — Phase 3 | 2026-06-27 |
| `dpl_6P74V7v94Nx4cyQtNV1VviDGeNd6` | `8e194e6` | ✅ READY → 200 en 7/7 rutas | 2026-06-27 |
| `dpl_9QkepajrzxRL3sE3xh6NB9Mhi9di` | `c828c76` | ✅ READY → 200 en 8/8 rutas | 2026-06-27 |

**Proyecto Vercel:** `prj_GMwUTB3OWKGAXoac1jiFAPwa1NeS`  
**Repo:** `https://github.com/Abel-Castill0/DPP.git` → rama `main`  
**Región:** `iad1` (US East, North Virginia) | **Node:** 24.x | **Bundler:** Turbopack

---

## Estado actual de producción (verificado con MCP)

### Supabase

| Check | Resultado |
|-------|-----------|
| Proyecto activo | ✅ `utvfbsebrvgyoxlvicqc` — ACTIVE_HEALTHY |
| PostgreSQL versión | ✅ 17.6.1.127 |
| Tablas en `public` | ✅ 15 tablas con seed data |
| `suppliers` | ✅ 4 filas |
| `items` | ✅ 8 filas |
| `purchase_orders` | ✅ 3 filas |
| `service_orders` | ✅ 2 filas |
| `cash_movements` | ✅ 3 filas |
| `max_connections` | ✅ 60 (free tier t4g.nano) |
| PgBouncer interno (puerto 5432) | ✅ Activo (solo IPv6) |
| Supavisor externo (puerto 6543) | ❌ NO activado — "tenant not found" |
| Migraciones en `supabase_migrations` | ⚠️ No existen (Prisma usa `_prisma_migrations`) |

### Vercel

| Check | Resultado |
|-------|-----------|
| Deployment latest | ✅ `dpl_DpT58RxEMwfrPv8M6q8BBmSQcHVx` — READY |
| Commit | ✅ `75a3f45` — "docs: update production deployment status" |
| Alias producción | ✅ `dpp-pink.vercel.app` → deployment activo |
| DATABASE_URL en Vercel | ✅ Apunta al pooler `aws-0-us-east-1.pooler.supabase.com:6543` |

### Rutas

| Ruta | Estado |
|------|--------|
| `/` | ✅ 200 |
| `/dashboard` | ✅ 200 |
| `/suppliers` | ✅ 200 |
| `/items` | ✅ 200 |
| `/purchase-orders` | ✅ 200 |
| `/service-orders` | ✅ 200 |
| `/cash-flow` | ✅ 200 |
| `/reports` | ✅ 200 |

---

## Diagnóstico definitivo (confirmado por Vercel MCP runtime errors)

### Error 1 — Resuelto ✅
**Direct host IPv6 / Vercel IPv4**
- 36 errores: `Can't reach database server at db.utvfbsebrvgyoxlvicqc.supabase.co` (P1001)
- Deployment afectado: `dpl_8XDGJCDpbcbT2Bh8vAxk5MBJgXBS` (anterior)
- Causa: `db.[ref].supabase.co` resuelve solo a IPv6. Vercel IAD1 usa IPv4 para salidas.
- Fix aplicado: DATABASE_URL actualizado a `aws-0-us-east-1.pooler.supabase.com:6543`

### Error 2 — Resuelto ✅
**Supavisor: tenant/user not found → activado**
- Causa: El proyecto no estaba registrado en Supavisor.
- Fix: Usuario activó Connection Pooling en Dashboard → Supabase inicializó el tenant automáticamente.
- DATABASE_URL actualizado a host `aws-1-us-east-1.pooler.supabase.com:6543` (pooler node asignado al proyecto).
- Último deployment post-fix: `dpl_9QkepajrzxRL3sE3xh6NB9Mhi9di` → 8/8 rutas 200 ✅

---

---

## Errores encontrados y fixes aplicados

### 1. SSL faltante en PrismaPg (commit `f6a9cf9`)
**Problema:** `PrismaPg({ connectionString })` sin `ssl` → Supabase rechazaba conexión.  
**Fix:** `const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined`

### 2. Páginas estáticas en producción (commit `f35c66e`)
**Problema:** 6 páginas de datos eran `○ (Static)` → bakeaban demo data en build.  
**Fix:** `export const dynamic = "force-dynamic"` en dashboard, suppliers, items, purchase-orders, service-orders, cash-flow.

### 3. DATABASE_URL vacío en Vercel
**Problema:** Vercel tenía DATABASE_URL en blanco.  
**Fix:** Actualizado vía API a URL del pooler con usuario correcto `postgres.[ref]`.

### 4. Host directo IPv6-only (causa raíz confirmada)
**Problema:** `db.[ref].supabase.co` → solo IPv6. Vercel IAD1 es IPv4 saliente.  
**Fix aplicado:** DATABASE_URL → `aws-0-us-east-1.pooler.supabase.com:6543` (IPv4 ✅)

### 5. Supavisor "tenant not found" → resuelto ✅
**Problema:** Supabase free tier no activa Supavisor automáticamente al crear proyecto.  
**Fix aplicado:** Usuario activó Connection Pooling en Dashboard. DATABASE_URL actualizado a `aws-1-us-east-1.pooler.supabase.com:6543` con `?pgbouncer=true`. DIRECT_URL corregido a host directo `db.[ref].supabase.co:5432`.

---

## Variables de entorno en Vercel

| Variable | Estado |
|----------|--------|
| `DATABASE_URL` | ✅ Pooler `aws-1-us-east-1.pooler.supabase.com:6543` + `?pgbouncer=true` |
| `DIRECT_URL` | ✅ Conexión directa (para migraciones locales) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ URL pública Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Solo server-side |

---

## Commits de esta sesión

| Commit | Descripción |
|--------|-------------|
| `188e2c8` | Scaffold DPP Control — fase 2 |
| `8ad00b3` | Phase 2.5 — CRUD, server actions |
| `a999715` | Connect Prisma to Supabase |
| `5ad16b7` | Migrations, seed, Playwright MCP |
| `f35c66e` | Fix: dynamic pages |
| `89fcda5` | Docs: vercel deploy status |
| `f6a9cf9` | Fix: SSL en PrismaPg para Supabase |
| `790cfb6` | Debug: /api/db-check (temporal) |
| `e07d4b0` | Chore: eliminar debug endpoint |
| `75a3f45` | Docs: update production deployment status |
| `8e194e6` | feat: connect orders with cash flow (Phase 3) |

---

## Próximos pasos

1. ✅ ~~Activar Connection Pooling en Supabase Dashboard~~
2. ✅ ~~Verificar 8/8 rutas → 200~~
3. ✅ ~~Fase 3: Flujo de caja real conectado a OC/OS — QA 27/27, deploy prod OK~~
4. **Fase 4:** Pagos parciales, formulario de pagos en OC/OS, reportes gerenciales reales
