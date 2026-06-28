# Fase 7A — Auditoría de seguridad y hardening de endpoints

Fecha de implementación: 2026-06-28  
Rama: `phase-7a-security`  
Commit feature: `5b1540e`  
Commit merge: `33df899`  
Deploy producción: `dpl_AZvwN44bWrTyNbmNShdDHG82W6am`  
URL producción: `https://dpp-pink.vercel.app`

## Objetivo

Auditar los endpoints `/api/reports/export` (Excel) y `/api/reports/export-pdf` (PDF), junto con el módulo `lib/data/reports.ts`, e implementar los fixes mínimos de seguridad sin rediseñar autenticación, sin cambiar funcionalidades visibles y sin romper Excel ni PDF.

## Alcance auditado

| Archivo / Módulo | Tipo |
|-----------------|------|
| `app/api/reports/export/route.ts` | API route — Excel |
| `app/api/reports/export-pdf/route.ts` | API route — PDF |
| `lib/data/reports.ts` — `buildFilters` | Param parsing |
| `lib/prisma.ts` | Cliente DB + `withDb` |
| `app/login/page.tsx` | Auth placeholder |
| `middleware.ts` | No existe |
| Variables de entorno | Revisadas (solo nombres) |

## Hallazgos — Matriz de seguridad

| ID | Endpoint / Módulo | Vulnerabilidad | Severidad | Estado |
|----|-------------------|----------------|-----------|--------|
| S01 | Todas las rutas | Sin `middleware.ts` — todas las páginas accesibles sin auth | ALTO | DOCUMENTADO — Fase 7B |
| S02 | `/api/reports/export`, `/api/reports/export-pdf` | Datos financieros sin autenticación | ALTO | DOCUMENTADO — Fase 7B |
| S03 | Ambos export routes | Sin try/catch — DB error podía emitir 500 no controlado | MEDIO | ✅ APLICADO |
| S04 | `buildFilters` | `origin`, `status`, `category` sin validación contra enums | MEDIO | ✅ APLICADO |
| S05 | `buildFilters` | `supplierId` aceptaba cualquier string sin validar UUID | BAJO | ✅ APLICADO |
| S06 | `.gitignore` | `.env.claude.local` | BAJO | ✅ YA CUBIERTO por `.env.*.local` |
| S07 | `/login` | Login visual sin auth real (`router.push("/dashboard")`) | ALTO | DOCUMENTADO — Fase 7B |

### Variables de entorno detectadas (nombres, sin valores)

- `DATABASE_URL` — server-side únicamente
- `NODE_ENV` — server-side
- `NEXT_PHASE` — server-side (build phase detection)

Ninguna variable privada expuesta como `NEXT_PUBLIC_`. `SUPABASE_SERVICE_ROLE_KEY` no se usa en ninguna API route ni componente cliente.

## Fixes aplicados (mínimos)

### S03 — try/catch en export routes

Ambos endpoints wrapeados en try/catch. Error interno retorna `"Error al generar exportación."` con status 500 — sin stack trace, sin detalles de DB.

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... lógica de export
  } catch {
    return new Response("Error al generar exportación.", { status: 500 })
  }
}
```

### S04 + S05 — Allowlist en `buildFilters`

Parámetros validados contra allowlists antes de llegar a Prisma. Valores inválidos → tratados como "sin filtro" (backward-compatible, sin error HTTP visible).

```typescript
const VALID_RANGES   = new Set(["this_month","last_month","last_30","last_90","this_year","custom"])
const VALID_ORIGINS  = new Set(["ORDEN_COMPRA","ORDEN_SERVICIO","MANUAL","IMPORTADO"])
const VALID_STATUSES = new Set(["CANCELADO","ADELANTO","COBRADO","POR_PAGAR","POR_COBRAR","DEVOLUCIONES","OTROS"])
const VALID_CATEGORIES = new Set(["CONFECCION","CORTE","ESTAMPADO","ACABADO_EMPAQUE","MATERIA_PRIMA",
  "PLANILLA","IMPUESTO","MOVILIDAD","COMISION","CAJA_CHICA","PRESTAMO","INVERSION","COMPRA","VENTA","OTROS"])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

## QA — Verificación local (Fase 7A.1)

| Check | Resultado |
|-------|-----------|
| Lint (`npm run lint`) | ✓ 0 errores |
| Build (`npm run build`) | ✓ 19 rutas, TypeScript OK |
| Rutas 7/7 local | ✓ 200 |
| Excel 7/7 filtros local | ✓ 200, magic=`PK`, CT/CD/CC OK |
| PDF 7/7 filtros local | ✓ 200, magic=`%PDF-`, CT/CD/CC OK |
| Inputs inválidos 8/8 local | ✓ 200, salida válida, sin stack trace |
| Secretos en git diff | ✓ Ninguno |
| Archivos .pdf/.xlsx | ✓ Ninguno |

## QA — Verificación producción (Fase 7A.2)

| Check | Resultado |
|-------|-----------|
| Deploy | ✓ `dpl_AZvwN44bWrTyNbmNShdDHG82W6am` READY, alias `dpp-pink.vercel.app` |
| Rutas 7/7 producción | ✓ 200 |
| Excel 7/7 producción | ✓ 200, magic=`PK`, CT xlsx, CD attachment, CC no-store |
| PDF 7/7 producción | ✓ 200, magic=`%PDF-`, CT application/pdf, CD attachment, CC no-store |
| Inputs inválidos Excel 4/4 | ✓ 200, magic=`PK`, sin stack trace |
| Inputs inválidos PDF 4/4 | ✓ 200, magic=`%PDF-`, sin stack trace |

### Excel producción — detalle

| Filtro | HTTP | Bytes | magic |
|--------|------|-------|-------|
| `range=this_month` | 200 | 12592 | `PK` |
| `range=this_year` | 200 | 13833 | `PK` |
| `range=last_30` | 200 | 12594 | `PK` |
| `origin=ORDEN_COMPRA` | 200 | 12611 | `PK` |
| `status=POR_PAGAR` | 200 | 12619 | `PK` |
| `category=ESTAMPADO` | 200 | 12616 | `PK` |
| `range=custom&startDate=2000-01-01&endDate=2000-12-31` | 200 | 12596 | `PK` |

### PDF producción — detalle

| Filtro | HTTP | Bytes | magic |
|--------|------|-------|-------|
| `range=this_month` | 200 | 2196 | `%PDF-` |
| `range=this_year` | 200 | 5363 | `%PDF-` |
| `range=last_30` | 200 | 2229 | `%PDF-` |
| `origin=ORDEN_COMPRA` | 200 | 2231 | `%PDF-` |
| `status=POR_PAGAR` | 200 | 2235 | `%PDF-` |
| `category=ESTAMPADO` | 200 | 2243 | `%PDF-` |
| `range=custom&startDate=2000-01-01&endDate=2000-12-31` | 200 | 2221 | `%PDF-` |

## Riesgos pendientes — Fase 7B

Los riesgos S01, S02 y S07 son ALTOS y requieren autenticación real:

- **S01/S02**: Todas las rutas y endpoints API son públicamente accesibles. Cualquiera con acceso a la URL puede descargar los datos financieros completos.
- **S07**: El formulario de login en `/login` no autentica — `router.push("/dashboard")` redirige sin verificar credenciales.

**Diseño recomendado para Fase 7B:**
- `middleware.ts` en raíz del proyecto
- Proteger `/(app)/**` y `/api/**` (excepto `/login`)
- Supabase Auth o NextAuth.js como proveedor
- Session cookie httpOnly validada en middleware

Esta fase NO implementa auth por diseño (CLAUDE.md: "No implementar auth real todavía").
