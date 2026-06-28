# Fase 4B — Reportes gerenciales

Fecha de implementación: 2026-06-28  
Preview: https://dpp-py92iu6i1-abelcastillotrabajo-6110s-projects.vercel.app/reports

## Objetivo

Convertir los datos financieros y operativos existentes (OC, OS, CashMovement, Payment) en reportes gerenciales accionables, sin nuevas migraciones.

## ¿Se necesitó migración?

**No.** Todos los reportes se calculan desde tablas ya existentes:
- `cash_movements` — egresos/ingresos, estado, categoría, abono, invoiceAmount
- `payments` — pagos parciales con método y fecha
- `purchase_orders` / `service_orders` — órdenes sin movimiento de caja
- `suppliers` — nombre del proveedor

## Reportes implementados

### A. Resumen ejecutivo (KPI cards)
- Total por pagar: `SUM(invoiceAmount - abono)` donde `aPagar > 0`
- Pagado este mes: `SUM(Payment.amount)` donde `date >= startOfMonth`
- Parciales activos: `COUNT(operationStatus = ADELANTO)`
- Órdenes sin caja: OC + OS donde `cashMovements: { none: { isVoid: false } }`

### B. Cuentas por pagar
Fuente: `CashMovement` donde `type=EGRESO AND aPagar > 0`  
Agrupadas por `supplier.name`, muestra importe, abonado y pendiente por proveedor.

### C. Pagos del mes
Fuente: `Payment` donde `date >= startOfMonth`  
Muestra métodos usados, total pagado y tabla de pagos recientes con proveedor.

### D. Pagos parciales activos
Fuente: `CashMovement` donde `operationStatus = ADELANTO`  
Muestra invoiceAmount, abono, aPagar y barra de progreso porcentual.

### E. Egresos por proveedor (top 10)
Fuente: `CashMovement` donde `type=EGRESO`, agrupados por `supplier.name`  
Ordenados por `abono DESC`. Gráfico de barras horizontal + tabla.

### F. Egresos por categoría
Fuente: `CashMovement` donde `type=EGRESO`, agrupados por `category`  
Muestra porcentaje sobre total de egresos. Gráfico de barras + tabla.

### G. Órdenes pendientes de caja
Fuente: `PurchaseOrder` y `ServiceOrder` donde `cashMovements: { none: { isVoid: false } }`  
Muestra tipo (OC/OS), N° orden, proveedor, proceso (OS), monto, estado y fecha.

### H. Flujo mensual
Fuente: `CashMovement` agrupados por mes (últimos 6 meses)  
Gráfico de barras con ingresos vs egresos por mes.

## Fórmulas clave

| Campo | Fórmula |
|-------|---------|
| `aPagar` | `MAX(0, invoiceAmount - abono)` |
| `porcentajePagado` | `ROUND(abono / invoiceAmount * 100)` |
| `porcentajeCategoria` | `ROUND(totalCategoria / totalEgresos * 100)` |

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `lib/data/reports.ts` | NUEVO — 8 queries reales + tipos + demo fallback |
| `components/reports-client.tsx` | NUEVO — client component con recharts + tablas |
| `app/(app)/reports/page.tsx` | Reemplazado — server component con `force-dynamic` |
| `scripts/verify-management-reports.ts` | NUEVO — QA 10 checks |

## QA ejecutado (2026-06-28)

| Script | Resultado |
|--------|-----------|
| `verify-management-reports.ts` | ✓ 10/10 |
| `verify-order-cashflow.ts` (regresión Fase 3) | ✓ 27/27 |
| `verify-partial-payments.ts` (regresión Fase 4A) | ✓ 22/22 |
| Lint | ✓ 0 errores |
| Build | ✓ Compiled successfully |
| Preview 5/5 rutas | ✓ 200 |

## Limitaciones

- **Exportación:** botones Excel/PDF son placeholder (Fase futura).
- **Filtros:** no hay filtros por fecha/proveedor/estado en UI (todos los reportes son globales).
- **Flujo mensual:** si hay < 1 mes de datos, el gráfico aparece con solo 1 barra.
- **Cuentas por cobrar:** no implementadas (requiere entidad Cliente, fuera de alcance actual).
- **Datos del mes:** si no hay pagos (`Payment`) registrados este mes, el total es S/ 0.

## Visualizaciones

| Sección | Tipo |
|---------|------|
| Flujo mensual | BarChart vertical (recharts) |
| Egresos por proveedor | BarChart horizontal (recharts) |
| Egresos por categoría | BarChart vertical (recharts) |
| Cuentas por pagar | Tabla con totales |
| Parciales activos | Tabla con barra de progreso |
| Órdenes sin caja | Tabla con badge OC/OS |
| Pagos del mes | Tabla + resumen de métodos |

## Siguiente fase recomendada

- **Fase 4C:** Filtros por fecha en reportes (client-side o SSR con searchParams)
- **Fase 5:** Exportación real a Excel (usando `xlsx` o `exceljs`)
- **Fase 6:** Módulo de clientes y cuentas por cobrar
