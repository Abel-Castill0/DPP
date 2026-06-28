# Vercel Deploy Status — DPP Control

**Última verificación:** 2026-06-28 — Phase 6 OC/OS PDFs — deploy producción OK, QA autenticado manual pendiente  
**Estado:** ✅ Producción OK — Phase 6 OC/OS PDFs merged + deployed | QA sin sesión 8/8 ✓ | QA autenticado: checklist manual pendiente confirmación usuario

---

## Deploys registrados

| URL | Commit | Estado | Fecha |
|-----|--------|--------|-------|
| `dpp-pink.vercel.app` (producción) | `6b67899` (merge Phase 6 PDFs) | ✅ READY + aliased — Phase 6 OC/OS PDFs | 2026-06-28 |
| `dpl_DcqVzxrtMWGVFKFEp6MD37d4ULqx` (Phase 6 PDFs prod) | `6b67899` | ✅ READY — sin sesión 8/8, build 22 rutas, QA auth manual ⏳ | 2026-06-28 |
| `dpp-n7svet62w-...vercel.app` (preview Phase 6 PDFs) | `04e4689` | ✅ READY — rama `phase-6-order-pdfs` | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `d4df68e` | ✅ READY — Phase 7B | 2026-06-28 |
| `dpl_CgANQGfuuSLYAWmmFdD28zAR6nSY` (Phase 7B prod) | `d4df68e` | ✅ READY — /login 200, 7/7 rutas → /login, /api/reports/export → 401 | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `33df899` (latest) | ✅ READY + aliased — Phase 7A | 2026-06-28 |
| `dpl_AZvwN44bWrTyNbmNShdDHG82W6am` (Phase 7A prod) | `33df899` | ✅ READY — 7/7 rutas + 7/7 Excel + 7/7 PDF + 8/8 inválidos OK | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `1445845` | ✅ Phase 6 | 2026-06-28 |
| `dpl_AoS7NJawfnNxU99ZDT1gYinjUFkt` (Phase 6 prod) | `1445845` | ✅ READY — 7/7 rutas + 7/7 PDF 200 + Excel sin regresión | 2026-06-28 |
| `dpl_AoS7NJawfnNxU99ZDT1gYinjUFkt` (Phase 6 prod) | `1445845` | ✅ READY — 7/7 rutas + 7/7 PDF 200 + Excel sin regresión | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `9c8bc2b` | ✅ Phase 5 | 2026-06-28 |
| `dpl_CMToo46i2cXrREkps9ydGoWNLrWv` (Phase 5 prod) | `9c8bc2b` | ✅ READY — 7/7 rutas + 7/7 endpoints Excel 200 | 2026-06-28 |
| Preview Phase 5 (`dpp-775ci3qh2-...vercel.app`) | dirty (local) | ✅ READY — /reports 200, export QA 32/32 | 2026-06-27 |
| Preview Phase 4C (`dpp-hp44g3375-...vercel.app`) | `62cf964` | ✅ READY — 7/7 rutas 200 | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `ee0555c` | ✅ Phase 4B | 2026-06-28 |
| Preview Phase 4B (`dpp-py92iu6i1-...vercel.app`) | `ee0555c` | ✅ READY — 5/5 rutas 200 | 2026-06-28 |
| `dpp-pink.vercel.app` anterior | `5cb0752` | ✅ Phase 4A | 2026-06-28 |
| Preview Phase 4A (`dpp-5wsddxoif-...vercel.app`) | `5cb0752` | ✅ READY — 5/5 rutas 200 | 2026-06-27 |
| `dpp-pink.vercel.app` anterior | `8e194e6` | ✅ Phase 3 | 2026-06-27 |
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
| `5cb0752` | feat: partial payments Phase 4A |
| `ee0555c` | feat: add management reports (Phase 4B) |
| `62cf964` | feat: add report filters (Phase 4C) |
| `877f9a5` | feat: add PDF export for reports (Phase 6A) |
| `1445845` | Merge branch 'phase-6a-pdf-export' (Phase 6A merge) |
| `9c8bc2b` | feat: export filtered reports to excel (Phase 5) |

---

## Próximos pasos

1. ✅ ~~Activar Connection Pooling en Supabase Dashboard~~
2. ✅ ~~Verificar 8/8 rutas → 200~~
3. ✅ ~~Fase 3: Flujo de caja real conectado a OC/OS — QA 27/27, deploy prod OK~~
4. ✅ ~~Fase 4A: Pagos parciales — QA 22/22, preview OK (5/5 rutas 200)~~
5. ✅ ~~Deploy producción Phase 4A — 7/7 rutas 200, pagos parciales QA OK~~
6. ✅ ~~Fase 4B: Reportes gerenciales — QA 10/10, preview 5/5 rutas 200~~
7. ✅ ~~Deploy producción Phase 4B — 7/7 rutas 200, reportes gerenciales QA OK~~
8. ✅ ~~Fase 4C: Filtros avanzados en /reports — QA 49/49, preview 7/7 rutas 200~~
9. ✅ ~~Deploy producción Phase 4C — 7/7 rutas 200 + 7/7 filtros 200, sin secretos~~
10. ✅ ~~Fase 5: Exportación Excel — QA 32/32, preview READY~~
11. ✅ ~~Deploy producción Phase 5 — commit 9c8bc2b, deploy dpl_CMToo46i2cXrREkps9ydGoWNLrWv, 7/7 rutas 200 + 7/7 endpoints Excel 200, secretos: ninguno~~
12. ✅ ~~Deploy producción Phase 6A — commit 877f9a5, merge 1445845, deploy dpl_AoS7NJawfnNxU99ZDT1gYinjUFkt, 7/7 rutas 200 + 7/7 endpoints PDF 200 + Excel sin regresión, secretos: ninguno~~
13. ✅ ~~Deploy producción Phase 7A — commit 5b1540e, merge 33df899, deploy dpl_AZvwN44bWrTyNbmNShdDHG82W6am, 7/7 rutas + 7/7 Excel + 7/7 PDF + 8/8 inputs inválidos controlados, secretos: ninguno~~
14. ✅ ~~Deploy producción Phase 7B — commit 23f31ee (rama) + merge d4df68e (main), deploy dpl_CgANQGfuuSLYAWmmFdD28zAR6nSY, /login 200 + 7/7 rutas protegidas + /api/reports/export → 401, AUTH_SECRET en Vercel, admin en prod DB~~
15. ✅ Preview Phase 6 OC/OS PDFs — rama `phase-6-order-pdfs`, commit `04e4689`, deploy `dpl_9MwZveT8qL5UHnRgUJoKNpup2SvT` READY — QA autenticado 20/20 ✓, regresión 148/148 ✓
16. ⏳ Deploy producción Phase 6 OC/OS PDFs — commit `6b67899` (merge --no-ff), deploy `dpl_DcqVzxrtMWGVFKFEp6MD37d4ULqx`, sin sesión 8/8 ✓, regresión pre-merge 148/148 ✓ — QA autenticado manual pendiente confirmación usuario
