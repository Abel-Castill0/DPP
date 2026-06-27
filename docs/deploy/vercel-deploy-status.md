# Vercel Deploy Status — DPP Control

**Última verificación:** 2026-06-27  
**Estado:** ⚠️ Producción requiere 1 acción en Supabase Dashboard (ver abajo)

---

## Deploys registrados

| URL | Commit | Estado | Fecha |
|-----|--------|--------|-------|
| `dpp-pink.vercel.app` (alias producción) | `f6a9cf9` SSL fix | READY | 2026-06-27 20:28 |
| `dpp-ave33y7jr-...vercel.app` | `f6a9cf9` SSL fix + nuevo DATABASE_URL | READY | 2026-06-27 20:50 |

**Proyecto Vercel:** `prj_GMwUTB3OWKGAXoac1jiFAPwa1NeS`  
**Repo:** `https://github.com/Abel-Castill0/DPP.git` → rama `main`

---

## Diagnóstico de producción (2026-06-27)

### Rutas verificadas

| Ruta | Preview ✅ | Producción |
|------|-----------|------------|
| `/` (redirect) | ✅ 307 | ⚠️ 307→500 |
| `/dashboard` | ✅ 200 | ❌ 500 |
| `/suppliers` | ✅ 200 | ❌ 500 |
| `/items` | ✅ 200 | ❌ 500 |
| `/purchase-orders` | ✅ 200 | ❌ 500 |
| `/service-orders` | ✅ 200 | ❌ 500 |
| `/cash-flow` | ✅ 200 | ❌ 500 |
| `/reports` | ✅ 200 | ✅ 200 |

*`/reports` funciona porque es estático (sin DB). Las 6 páginas dinámicas fallan por red.*

### Causa raíz identificada

**`db.utvfbsebrvgyoxlvicqc.supabase.co` solo tiene dirección IPv6.**  
Las funciones serverless de Vercel no soportan conexiones salientes IPv6.

```
Diagnóstico via /api/db-check (temporal, ya eliminado):
{
  "hasDb": true,
  "host": "db.utvfbsebrvgyoxlvicqc.supabase.co",
  "isSupabase": true,
  "dbStatus": "error",
  "dbError": "Can't reach database server at db.utvfbsebrvgyoxlvicqc.supabase.co"
}
```

DNS de `db.[ref].supabase.co` → `2600:1f18:38df:9501:5476:d5d8:79c2:2a34` (solo IPv6).  
Vercel IAD1 usa IPv4 para conexiones salientes → la conexión directa falla.

---

## ⚠️ Acción requerida (solo 1 vez, ~2 minutos)

**El usuario debe activar Connection Pooling en Supabase Dashboard:**

1. Ir a: **https://supabase.com/dashboard/project/utvfbsebrvgyoxlvicqc/settings/database**
2. Buscar la sección: **Connection Pooling**
3. Activar el pooler (PgBouncer) → modo **Transaction**
4. ¡Listo! No hay que cambiar nada más — el DATABASE_URL en Vercel ya está configurado con la URL correcta del pooler.

> El pooler de Supabase usa IPv4 (`aws-0-us-east-1.pooler.supabase.com`) y está diseñado específicamente para entornos serverless como Vercel.

**DATABASE_URL en Vercel** (ya actualizado, esperando que pooler esté activo):
- Usuario: `postgres.utvfbsebrvgyoxlvicqc` ← formato correcto para pooler
- Host: `aws-0-us-east-1.pooler.supabase.com`
- Puerto: `6543` (transaction mode)

---

## Errores encontrados y fixes aplicados

### 1. SSL faltante en PrismaPg (commit `f6a9cf9`)

**Problema:** `PrismaPg({ connectionString })` sin `ssl` → Supabase rechazaba conexión.  
**Fix:** `const ssl = url.includes("supabase") ? { rejectUnauthorized: false } : undefined`

### 2. Páginas estáticas en producción (commit `f35c66e`)

**Problema:** Las 6 páginas de datos eran `○ (Static)` → bakeaban demo data en build.  
**Fix:** `export const dynamic = "force-dynamic"` en 6 páginas.

### 3. DATABASE_URL vacío en Vercel (detectado esta sesión)

**Problema:** Vercel tenía DATABASE_URL en blanco/incorrecto.  
**Fix:** Actualizado vía API a URL del pooler con usuario correcto `postgres.[ref]`.

### 4. Supabase direct URL solo IPv6 (causa raíz del 500)

**Problema:** `db.[ref].supabase.co` → solo IPv6, Vercel serverless solo usa IPv4.  
**Fix pendiente:** Activar Connection Pooling en Supabase Dashboard (ver arriba).

---

## Variables de entorno en Vercel

| Variable | Tipo | Estado |
|----------|------|--------|
| `DATABASE_URL` | sensitive | ✅ Actualizada → pooler `aws-0-us-east-1.pooler.supabase.com:6543` |
| `DIRECT_URL` | sensitive | ✅ Direct connection (para migraciones locales) |
| `NEXT_PUBLIC_SUPABASE_URL` | sensitive | ✅ URL pública Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sensitive | ✅ Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sensitive | ✅ Solo server |

---

## Estado de Supabase (base de datos)

| Check | Resultado |
|-------|-----------|
| Proyecto activo | ✅ PostgreSQL 17.6 |
| Migración `init_phase2` | ✅ Aplicada |
| Tablas | ✅ 14 tablas (suppliers, items, purchase_orders, etc.) |
| Conexión directa desde local | ✅ Funciona (IPv6) |
| Conexión directa desde Vercel | ❌ Falla (Vercel no soporta IPv6 saliente) |
| Pooler habilitado | ❌ Pendiente activar en Dashboard |

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

---

## Próximos pasos

1. **Usuario:** Activar Connection Pooling en Supabase Dashboard (link arriba)
2. **Automático:** Vercel detectará el nuevo DATABASE_URL en el próximo request
3. **Verificar:** `https://dpp-pink.vercel.app/dashboard` debería devolver 200
4. **Prueba QA:** Crear "Proveedor QA Producción" e "Item QA Producción" via formularios
5. **Fase 3:** Flujo de caja real conectado a OC/OS

