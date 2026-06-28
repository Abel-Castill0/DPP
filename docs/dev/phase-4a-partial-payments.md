# Fase 4A — Pagos parciales e historial

Fecha de implementación: 2026-06-27  
Preview: https://dpp-5wsddxoif-abelcastillotrabajo-6110s-projects.vercel.app

## Objetivo

Permitir registrar abonos parciales a movimientos de egreso, con trazabilidad completa: quién pagó, cuándo, por qué medio y con qué número de operación.

## Modelo de datos

### Campos nuevos en `payments`

| Campo            | Tipo      | Descripción                              |
|-----------------|-----------|------------------------------------------|
| `invoice_id`    | TEXT?     | Ahora nullable (antes NOT NULL)          |
| `payment_method`| TEXT      | Enum: TRANSFERENCIA, DEPOSITO, EFECTIVO, CHEQUE, TARJETA, OTRO |
| `operation_number` | TEXT?  | Número de transferencia/voucher          |
| `notes`         | TEXT?     | Observación libre                        |
| `created_by_id` | TEXT?     | FK → users(id)                          |

### Migración aplicada

`prisma/migrations/20260627000001_add_payment_fields/migration.sql`

Aplicada directamente vía Supabase MCP (no `migrate dev`, ver limitación abajo) y registrada en `_prisma_migrations`.

## Máquina de estados

```
POR_PAGAR (abono = 0)
    ↓ primer abono parcial
ADELANTO (0 < abono < invoiceAmount)
    ↓ abono completa el importe
COBRADO (abono >= invoiceAmount)
    ↑ revertir último pago
ADELANTO
    ↑ revertir único pago
POR_PAGAR
```

La transición se calcula en `recalc()`, función interna que corre dentro de `$transaction`. No hay campos de estado separados: el estado se deriva de `abono` vs `invoiceAmount`.

## Server actions (`app/actions/payments.ts`)

### `registerPayment(data)`

- Valida: monto > 0, fecha requerida, método requerido, sin sobrepago.
- Crea `Payment`, llama `recalc()`, sincroniza `paymentStatus` en OC/OS asociada.
- Revalida: `/cash-flow`, `/purchase-orders`, `/service-orders`, `/dashboard`.

### `revertLastPayment(cashMovementId)`

- Elimina el Payment más reciente (por `createdAt desc`).
- Llama `recalc()`, sincroniza OC/OS.
- Solo revierte el último — no permite borrado arbitrario (auditoría).

### `getPaymentHistory(cashMovementId)`

- Retorna lista de pagos con método, N° operación, observación y nombre del responsable.
- Ordena por `date asc`.

## UI (`components/payment-modal.tsx`)

Modal de dos pestañas accesible desde `/cash-flow`:

- **Registrar pago**: monto, fecha (hoy por defecto), método, N° operación, observación. Botón "Pago total" rellena el saldo pendiente automáticamente.
- **Historial**: lista de pagos con todos los campos. Botón "Revertir último pago" (visible solo si hay pagos y aún queda saldo).

Resumen financiero siempre visible: Importe / Abonado / Saldo.

## Integración en `/cash-flow`

- Columna estado muestra badge POR_PAGAR / ADELANTO / COBRADO / CANCELADO.
- Badge con conteo de pagos (`2p`) junto al estado si hay > 0 pagos.
- Botón "Pagar" para movimientos EGRESO con `invoiceAmount` y saldo pendiente.
- Botón "Pagos (N)" para movimientos en ADELANTO (ya tienen abonos parciales).

## QA

Script: `scripts/verify-partial-payments.ts`  
Resultado: **22/22 pasados** (2026-06-27)

Cobertura:
1. Primer pago parcial (S/ 400) → ADELANTO, abono=400, aPagar=600
2. Segundo pago (S/ 600) → COBRADO, abono=1000, aPagar=0
3. Intento de sobrepago detectado correctamente (saldo=0)
4. Revertir último pago → ADELANTO, abono=400
5. Historial con método, observación y responsable
6. Limpieza de datos QA

Regresión Fase 3: `scripts/verify-order-cashflow.ts` → **27/27 pasados**

## Limitación conocida

`prisma migrate dev` falla con P1000 (authentication) porque el `DIRECT_URL` en `.env.claude.local` tiene el formato de usuario del pooler (`postgres.ref`) en lugar del directo (`postgres`). Workaround para migraciones futuras: aplicar SQL vía Supabase MCP y registrar manualmente en `_prisma_migrations`.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Payment model: invoiceId nullable + 4 campos nuevos; User: relación payments |
| `prisma/migrations/20260627000001_add_payment_fields/migration.sql` | Migración aplicada |
| `app/actions/payments.ts` | NUEVO: registerPayment, revertLastPayment, getPaymentHistory |
| `lib/data/cash-movements.ts` | Campo paymentCount via _count.payments |
| `components/payment-modal.tsx` | NUEVO: modal pago + historial |
| `components/cash-flow-client-page.tsx` | Integración modal, badges, botones |
| `scripts/verify-partial-payments.ts` | NUEVO: QA script 22 checks |
