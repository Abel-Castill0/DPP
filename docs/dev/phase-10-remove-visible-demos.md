# Phase 10 — Remove Visible Demo Data

**Fecha:** 2026-06-30
**Rama:** `phase-10-remove-visible-demos`
**Estado:** QA completo — pendiente aprobación para producción

---

## Contexto

Phase 9 cerró con auth real, sidebar con usuario real y session traceability en todas las acciones. Sin embargo, la auditoría detectó que varias páginas mostraban datos hardcoded, alertas nativas, usuarios ficticios y textos de prototipo que impiden considerar la app 100% profesional en producción.

Phase 10 elimina todos los demos **visibles** en producción sin tocar flujos estables ni implementar funcionalidades futuras.

---

## Demos y placeholders eliminados

### `components/header.tsx`
- Eliminado badge "MODO DEMO" que aparecía en el header de todas las páginas.
- El badge era incondicional — se mostraba aunque `isDemo` fuera `false`.

### `app/(app)/cash-flow/new/page.tsx` + `_components/new-movement-form.tsx`
- Convertido de `"use client"` a async server component wrapper.
- Eliminados `demo-1`, `demo-2`, `demo-3` como opciones de "Responsable".
- Eliminado texto "Parte demo" en el select de proveedor.
- "Registrado por": ahora muestra el nombre/email del usuario de sesión real (read-only, no select).
- "Proveedor": carga proveedores activos reales desde BD. Si no hay, muestra mensaje profesional.
- `retencion` y `detraccion`: conectados a estado y pasados a la server action.
- `supplierId`: conectado a estado y enviado a `createCashMovement`.
- Tipos corregidos para `Select.onValueChange` de base-ui v4 (`string | null`).

### `app/(app)/settings/page.tsx`
- Eliminados `demoUsers` (paola@dpp.pe, carlos@dpp.pe, allison@dpp.pe).
- Eliminado texto "datos de demostración".
- Eliminada referencia "Fase 7".
- Eliminados botones disabled con comportamiento engañoso.
- Reemplazado por: datos reales de sesión (nombre, email, rol con colores), estado de seguridad real (JWT 8h, bcrypt, middleware), preferencias del sistema.

### `app/(app)/imports/page.tsx`
- Eliminado `alert()` del botón de importar.
- Eliminado texto "980 filas válidas", "18 filas con error" (datos fake).
- Botón de importar: `disabled` con label "Importación próximamente".
- Los 4 tipos de importación muestran badge "Próximamente" (no clickeables).
- Módulo honesto: explica que el importador Excel está pendiente de activación.

### `components/dashboard-client.tsx`
- Eliminados KPI cards: "Cuentas por Cobrar", "Facturas Vencidas" (sin base de datos real).
- Eliminada tabla "Top por Cobrar".
- Eliminados trend labels hardcoded "+8% vs. mes anterior", "-3% vs. mes anterior".
- Agregado estado vacío profesional para gráfico y tabla `topPagar`.

### `lib/data/dashboard.ts`
- Eliminados campos `porCobrar`, `facturaVencidas`, `topCobrar` del tipo `DashboardKpis`.
- `monthlyChart`: calculado desde los últimos 6 meses de `CashMovements` reales (MONTHS_ES).
- `topPagar`: calculado desde movimientos POR_PAGAR reales (top 5 por monto).
- `demoData` permanece solo como fallback para dev/build (cuando no hay `DATABASE_URL`).
- En producción (Vercel), `DATABASE_URL` siempre está presente → fallback nunca se activa.

### `app/actions/cash-movements.ts`
- Añadidos campos `retencion` y `detraccion` a la server action `createCashMovement`.

---

## Módulos corregidos

| Módulo | Antes | Después |
|--------|-------|---------|
| Header global | Badge "MODO DEMO" en todas las páginas | Sin badge |
| `/cash-flow/new` | demo-1/2/3 hardcoded, proveedor sin BD | Sesión real, proveedores reales |
| `/settings` | 3 usuarios ficticios, Fase 7 | Sesión real, estado de seguridad real |
| `/imports` | `alert()`, datos fake, parser prometido | Módulo honesto "Próximamente" |
| Dashboard KPIs | porCobrar/facturaVencidas hardcoded | KPIs reales desde BD |
| Dashboard chart | `demoMonthlyChart` hardcoded | Últimos 6 meses desde CashMovements |

---

## Qué quedó pendiente para fases futuras

- **Gestión completa de usuarios**: crear/editar/desactivar usuarios → Phase 13.
- **Cambio de contraseña desde UI**: pendiente de Phase 13.
- **Importador Excel real**: pendiente de Phase 14+ (requiere parser + validación).
- **KPI "Cuentas por Cobrar"**: requiere módulo de clientes/facturas de venta → Phase 12+.
- **KPI "Facturas Vencidas"**: requiere módulo de cuentas por cobrar → Phase 12+.
- **Roles avanzados y permisos granulares**: pendiente de Phase 13.

---

## QA ejecutado

### verify-no-visible-demos.ts (nuevo — Phase 10)
- **24/24 checks pasados**
- No "MODO DEMO" en header
- No demo-1/2/3 ni "Parte demo" en cash-flow/new
- No demoUsers/Fase 7/emails ficticios en settings
- No alert() ni datos fake en imports
- Dashboard no usa demoMonthlyChart en production path (withDb callback)
- No prisma.user.findFirst() en actions
- No demoUser/seed messages en actions
- No credenciales hardcoded (admin123, DppAdmin2026)
- No demo supplier IDs (sup-1, sup-2)
- requireUserId activo en createCashMovement
- No trend labels hardcoded en dashboard-client
- settings usa getSession()

### Scripts de regresión (todos 100% PASS)
| Script | Checks | Resultado |
|--------|--------|-----------|
| verify-session-traceability | 10 | ✓ PASS |
| verify-order-create-forms | 9 | ✓ PASS |
| verify-order-edit-cancel | 29 | ✓ PASS |
| verify-order-pdfs | 7 | ✓ PASS |
| verify-order-cashflow | 28 | ✓ PASS |
| verify-partial-payments | 22 | ✓ PASS |
| verify-management-reports | 10 | ✓ PASS |
| verify-report-filters | 49 | ✓ PASS |
| verify-report-export | 32 | ✓ PASS |

**Total regresión: 196 checks, 0 fallos.**

### Build y lint
- `npm run lint`: 0 errores (61 warnings pre-existentes en scripts, no en app)
- `npm run build`: 0 errores TypeScript, 25 rutas generadas correctamente

---

## Limitaciones conocidas

- `demoData` en `lib/data/dashboard.ts` permanece como fallback para `npm run dev` sin BD. Esto es intencional — `withDb` lo usa solo cuando `DATABASE_URL` no está disponible.
- Los warnings de lint en `scripts/` son del patrón `expr ? ok() : fail()` — pre-existentes, no son errores.
- El banner `isDemo` en páginas de listado permanece en el código pero nunca se muestra en producción porque `DATABASE_URL` siempre está presente en Vercel.

---

## Siguiente fase recomendada

**Phase 11** — Módulo de proveedores mejorado (búsqueda, edición inline) o Phase 12 con módulo básico de cuentas por cobrar para habilitar KPIs reales de ingresos.

**Phase 13** — Gestión de usuarios desde UI (crear, editar rol, desactivar).
