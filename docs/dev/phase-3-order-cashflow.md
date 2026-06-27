# Phase 3 — OC/OS → Flujo de Caja

## Resumen

Conecta las Órdenes de Compra y Órdenes de Servicio con el flujo de caja real. Genera movimientos de caja desde cada orden, permite marcar como pagado o revertir, y actualiza el dashboard con datos reales.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/actions/orders-to-cash.ts` | **NUEVO** — 4 server actions |
| `lib/data/purchase-orders.ts` | +`hasCashMovement`, `cashMovementStatus`, `cashMovementId` |
| `lib/data/service-orders.ts` | +`hasCashMovement`, `cashMovementStatus`, `cashMovementId` |
| `lib/data/cash-movements.ts` | +`purchaseOrderId`, `serviceOrderId` al tipo y query |
| `lib/data/dashboard.ts` | `porPagar` real desde `CashMovement.POR_PAGAR` |
| `components/purchase-orders-client-page.tsx` | Columna "Caja" + botón "Enviar a caja" |
| `components/service-orders-client-page.tsx` | Columna "Caja" + botón "Enviar a caja" |
| `components/cash-flow-client-page.tsx` | Columnas Origen/N° Orden + botones "Pagar"/"Revertir" |
| `scripts/verify-order-cashflow.ts` | **NUEVO** — QA script 27 checks |

## Server Actions (`app/actions/orders-to-cash.ts`)

### `generateFromPurchaseOrder(orderId)`
- Verifica que no exista movimiento previo (prevención de duplicados)
- Crea `CashMovement`: `type=EGRESO`, `origin=ORDEN_COMPRA`, `operationStatus=POR_PAGAR`, `category=COMPRA`
- `invoiceAmount = OC.totalAmount`, `abono = 0`
- `revalidatePath` en `/cash-flow`, `/purchase-orders`, `/dashboard`

### `generateFromServiceOrder(orderId)`
- Igual pero `origin=ORDEN_SERVICIO`
- `category` mapeada por proceso: `ESTAMPADO→ESTAMPADO`, `BORDADO→CONFECCION`, `ACABADO/EMPAQUE/LAVADO→ACABADO_EMPAQUE`

### `markMovementPaid(movementId)`
- Valida `invoiceAmount > 0`
- En `$transaction`: actualiza `operationStatus=COBRADO`, `abono=invoiceAmount`
- Si tiene `purchaseOrderId`: actualiza OC `paymentStatus=PAGADO`
- Si tiene `serviceOrderId`: actualiza OS `paymentStatus=PAGADO`

### `markMovementPending(movementId)`
- Revierte: `operationStatus=POR_PAGAR`, `abono=0`, `expenseAmount=0`, `incomeAmount=0`

## Modelo de datos

Sin migraciones nuevas — los FKs `purchaseOrderId` / `serviceOrderId` en `CashMovement` ya existían.

```
CashMovement
  purchaseOrderId  → PurchaseOrder (nullable)
  serviceOrderId   → ServiceOrder  (nullable)
  origin           ORDEN_COMPRA | ORDEN_SERVICIO | MANUAL | IMPORTADO
  operationStatus  POR_PAGAR | COBRADO | ADELANTO | CANCELADO | ...
  invoiceAmount    monto total de la obligación
  abono            monto pagado
  aPagar           = invoiceAmount - abono (calculado en data layer)
```

## QA — 2026-06-27

**Script:** `npx tsx --env-file=.env.local scripts/verify-order-cashflow.ts`

**Resultado:** 27/27 checks pasados, 0 fallidos

| Check | Resultado |
|-------|-----------|
| OC-QA creada y vinculada | ✓ |
| `origin = ORDEN_COMPRA` | ✓ |
| `purchaseOrderId` vinculado | ✓ |
| `serviceOrderId = null` | ✓ |
| `invoiceAmount = 1500` | ✓ |
| `abono = 0` | ✓ |
| `aPagar = 1500` | ✓ |
| `operationStatus = POR_PAGAR` | ✓ |
| Prevención duplicado OC | ✓ |
| OS-QA creada y vinculada | ✓ |
| `origin = ORDEN_SERVICIO` | ✓ |
| `serviceOrderId` vinculado | ✓ |
| `purchaseOrderId = null` | ✓ |
| `invoiceAmount = 900` | ✓ |
| `category = ESTAMPADO` (proceso ESTAMPADO) | ✓ |
| `operationStatus = POR_PAGAR` | ✓ |
| Prevención duplicado OS | ✓ |
| Pagar: `operationStatus = COBRADO` | ✓ |
| Pagar: `abono = invoiceAmount` | ✓ |
| Pagar: `aPagar = 0` | ✓ |
| Pagar: `OC.paymentStatus = PAGADO` | ✓ |
| Revertir: `operationStatus = POR_PAGAR` | ✓ |
| Revertir: `abono = 0` | ✓ |
| Revertir: `aPagar = invoiceAmount` | ✓ |
| Dashboard `porPagar` desde BD real | ✓ |
| OS-QA en `POR_PAGAR` del dashboard | ✓ |
| Limpieza datos QA | ✓ |

**Rutas preview (HTTP 200 siguiendo redirects):**
- `/dashboard` ✓
- `/purchase-orders` ✓
- `/service-orders` ✓
- `/cash-flow` ✓
- `/reports` ✓

**Build:** 0 errores TypeScript, 17 rutas compiladas  
**Lint:** 0 errores, 0 warnings

**Preview URL:** https://dpp-hun5zryz9-abelcastillotrabajo-6110s-projects.vercel.app

## Estado

- [x] Server actions OC/OS → Caja
- [x] Prevención de duplicados
- [x] Marcar pagado / Revertir
- [x] Dashboard KPI `porPagar` real
- [x] Columnas Caja en tablas OC/OS
- [x] Columnas Origen/N° Orden en flujo de caja
- [x] QA script 27/27
- [ ] Producción (pendiente confirmación)
