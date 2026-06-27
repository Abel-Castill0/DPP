# Vercel Deploy Status — DPP Control

**Última verificación:** 2026-06-27 (vía Supabase MCP + Vercel MCP)  
**Estado:** ⚠️ 1 acción requerida en Supabase Dashboard — Supavisor no activado

---

## Deploys registrados

| URL | Commit | Estado | Fecha |
|-----|--------|--------|-------|
| `dpp-pink.vercel.app` (producción) | `75a3f45` docs update | READY | 2026-06-27 |
| `dpl_DpT58RxEMwfrPv8M6q8BBmSQcHVx` | `75a3f45` (latest) | READY + aliased | 2026-06-27 |

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
| `/` (redirect) | ⚠️ 307→500 (falla en landing) |
| `/dashboard` | ❌ 500 (P1001 → ENOTFOUND tenant) |
| `/suppliers` | ❌ 500 |
| `/items` | ❌ 500 |
| `/purchase-orders` | ❌ 500 |
| `/service-orders` | ❌ 500 |
| `/cash-flow` | ❌ 500 |
| `/reports` | ✅ 200 (estático, sin DB) |

---

## Diagnóstico definitivo (confirmado por Vercel MCP runtime errors)

### Error 1 — Resuelto ✅
**Direct host IPv6 / Vercel IPv4**
- 36 errores: `Can't reach database server at db.utvfbsebrvgyoxlvicqc.supabase.co` (P1001)
- Deployment afectado: `dpl_8XDGJCDpbcbT2Bh8vAxk5MBJgXBS` (anterior)
- Causa: `db.[ref].supabase.co` resuelve solo a IPv6. Vercel IAD1 usa IPv4 para salidas.
- Fix aplicado: DATABASE_URL actualizado a `aws-0-us-east-1.pooler.supabase.com:6543`

### Error 2 — Pendiente ❌
**Supavisor: tenant/user not found**
- 10 errores: `(ENOTFOUND) tenant/user postgres.utvfbsebrvgyoxlvicqc not found` (XX000 FATAL)
- Deployment afectado: `dpl_DpT58RxEMwfrPv8M6q8BBmSQcHVx` (LATEST — producción actual)
- Último error: `2026-06-27T21:31:58Z`
- Causa: El proyecto NO está registrado en el backend de Supavisor. El pooler externo IPv4 rechaza la conexión porque el "tenant" no fue inicializado.
- Fix requerido: Activar Connection Pooling en el Supabase Dashboard (acción manual, ~1 minuto)

---

## ⚠️ Acción requerida (única — ~1 minuto)

**Ir al Supabase Dashboard → habilitar Supavisor:**

```
https://supabase.com/dashboard/project/utvfbsebrvgyoxlvicqc/settings/database
```

1. Buscar sección **"Connection Pooling"**
2. Activar el pooler → modo **Transaction** (ya seleccionado por defecto)
3. Guardar

> El DATABASE_URL en Vercel ya tiene el formato correcto:
> - Host: `aws-0-us-east-1.pooler.supabase.com`
> - Puerto: `6543` (transaction mode)
> - Usuario: `postgres.utvfbsebrvgyoxlvicqc`
>
> Solo falta que Supabase registre el proyecto en el backend de Supavisor,
> lo que ocurre automáticamente al activar el pooler en el Dashboard.

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

### 5. Supavisor "tenant not found" (pendiente)
**Problema:** Supabase free tier no activa Supavisor automáticamente al crear proyecto.  
**Fix:** Activar manualmente en Dashboard (ver instrucción arriba).

---

## Variables de entorno en Vercel

| Variable | Estado |
|----------|--------|
| `DATABASE_URL` | ✅ Pooler `aws-0-us-east-1.pooler.supabase.com:6543` |
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

---

## Próximos pasos

1. **Usuario → Supabase Dashboard:** Activar Connection Pooling (link arriba)
2. **Verificar:** `https://dpp-pink.vercel.app/dashboard` debería devolver 200
3. **Prueba QA:** Crear "Proveedor QA Producción" e "Item QA Producción" via formularios
4. **Fase 3:** Flujo de caja real conectado a OC/OS
