# Hotfix: Report filters — nullable cashMovement

**Fecha:** 2026-06-29  
**Commit:** `4a677c5`  
**Rama:** `main`  
**Estado:** ✅ Deployed a producción

---

## Causa raíz

Dos bugs independientes producían el error `Cannot read properties of null (reading 'cashMovement')` y los 4 fallos en `verify-report-filters.ts`:

### Bug 1 — Import hoisting en scripts QA (causa principal)

tsx/esbuild **hoista todos los `import` estáticos al tope del archivo compilado** antes de ejecutar cualquier sentencia. Esto significa que `lib/prisma.ts` se evaluaba (y creaba el singleton `PrismaClient`) **antes** de que `dotenv.config()` configurara `DATABASE_URL`. Resultado: `prisma = null as unknown as PrismaClient`.

Luego, cuando `getReportsData` llamaba a `withDb(query)`:
- `withDb` chequeaba `process.env.DATABASE_URL` → ya estaba configurado (dotenv había corrido) → procedía
- `query()` hacía `prisma.cashMovement.findMany(...)` → `prisma` era `null` → `TypeError: Cannot read properties of null (reading 'cashMovement')`
- `withDb` capturaba el error → logeaba el mensaje → retornaba demo fallback → `isDemo: true`

### Bug 2 — Orden de carga dotenv invertido (causa secundaria)

Los scripts cargaban `.env.claude.local` primero y `.env.local` segundo (con `override: true`). La URL de **conexión directa** en `.env.local` (`db.{ref}.supabase.co`) sobreescribía la URL del **pooler** en `.env.claude.local` (`aws-1-us-east-1.pooler.supabase.com`). La conexión directa no resuelve DNS desde el entorno local.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/data/reports.ts` | Reemplaza `cashMovement: { select: { supplier: ... } }` en query de pagos por patrón two-query + `pmSupplierMap` (defensive code vs orphaned FKs) |
| `scripts/verify-report-filters.ts` | Orden dotenv corregido + import dinámico de `lib/data/reports` dentro de `main()` |
| `scripts/verify-report-export.ts` | Orden dotenv corregido + imports dinámicos dentro de `main()` |
| `scripts/verify-order-cashflow.ts` | Orden dotenv corregido |
| `scripts/verify-order-create-forms.ts` | Orden dotenv corregido: `.env.claude.local` en lugar de `.env` |

---

## Resultado final QA

| Script | Resultado |
|--------|-----------|
| `verify-report-filters.ts` | ✅ 49/49 (antes: 43/47) |
| `verify-report-export.ts` | ✅ 32/32 |
| `verify-order-cashflow.ts` | ✅ 28/28 |
| `verify-partial-payments.ts` | ✅ 22/22 |
| `verify-order-create-forms.ts` | ✅ 9/9 |
| `verify-order-pdfs.ts` | ✅ todos los tests locales ✓ |
| `npm run lint` | ✅ 0 errores |
| `npm run build` | ✅ 0 errores TypeScript |

---

## Patrón de fix para futuros scripts QA

Cuando un script QA importe módulos que transitivamenta importan `lib/prisma.ts`, usar **importación dinámica** dentro de `main()` para garantizar que dotenv corra antes:

```typescript
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: true })
dotenv.config({ path: ".env.claude.local", override: true })  // ← SIEMPRE ÚLTIMO

// ...

async function main() {
  // Importar módulos DB-dependientes DENTRO de main(), no al tope del archivo
  const { getReportsData } = await import("../lib/data/reports")
  // ...
}
```

Regla de orden dotenv: `.env.local` primero, `.env.claude.local` último (tiene la URL del pooler que siempre resuelve).
