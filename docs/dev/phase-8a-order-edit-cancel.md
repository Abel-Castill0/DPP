# Phase 8A — Order Edit & Cancel

## Summary

Adds editing and cancellation flows for Órdenes de Compra (OC) and Órdenes de Servicio (OS).

## New Routes

| Route | Description |
|---|---|
| `GET /purchase-orders/[id]/edit` | Edit OC form |
| `GET /service-orders/[id]/edit` | Edit OS form |

## New Server Actions

| Action | File | Behavior |
|---|---|---|
| `updatePurchaseOrder` | `app/actions/purchase-orders.ts` | Updates OC items, dates, notes; blocks supplier/total change if CashMovement exists |
| `cancelPurchaseOrder` | `app/actions/purchase-orders.ts` | Sets status=ANULADA, voids linked CashMovements; blocked if paidAmount > 0 |
| `updateServiceOrder` | `app/actions/service-orders.ts` | Same as OC but includes process/proformaCode fields |
| `cancelServiceOrder` | `app/actions/service-orders.ts` | Same cancellation logic as OC |

## Business Rules

### Edit

- `canEditFinancial = !hasCashMovement && status !== "ANULADA"`
- If `canEditFinancial = true`: all fields editable (supplier, process, items, total)
- If `canEditFinancial = false` (CashMovement exists): only dates, proformaCode, and notes can change; financial fields locked in UI and enforced in server action

### Cancel

- `canCancel = status !== "ANULADA" && paidAmount === 0`
- Requires a non-empty `reason` string
- Transaction: voids all non-voided CashMovements (`isVoid=true`, `voidReason` set), then updates order `status=ANULADA`
- If CashMovement has payments, cancellation is blocked

## Data Layer Additions

Both `getPurchaseOrderDetail` and `getServiceOrderDetail` return:
```typescript
{
  hasCashMovement: boolean
  hasPayments: boolean
  canEditFinancial: boolean
  canCancel: boolean
  items: [...]
}
```

## UX

- **List pages** (`/purchase-orders`, `/service-orders`): Editar button (links to edit route) and Anular button (opens inline confirmation dialog) per row — hidden for ANULADA orders; Anular hidden if paidAmount > 0
- **Edit pages**: Warning banner when financial fields locked; Info banner when all fields editable
- **Cancel dialog**: Textarea for reason, validation before submission

## QA

Script: `scripts/verify-order-edit-cancel.ts`

```
npx tsx scripts/verify-order-edit-cancel.ts
```

Result: 29/29 checks passed.

## Migration

No migration needed — `ANULADA` status and `isVoid`/`voidReason` fields were already in the schema.
