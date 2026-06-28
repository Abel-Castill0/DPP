# Fase 4C — Filtros avanzados en reportes gerenciales

Fecha de implementación: 2026-06-28  
Commit: `62cf964`

## Objetivo

Agregar filtros reales en `/reports` que permitan al gerente consultar datos por rango de fechas, proveedor, origen, estado de pago y categoría. Los filtros se reflejan en la URL para poder compartir o recargar vistas filtradas.

## ¿Se necesitó migración?

**No.** Todos los campos de filtro ya existen en el schema:
- `CashMovement.date`, `CashMovement.supplierId`, `CashMovement.origin`, `CashMovement.operationStatus`, `CashMovement.category`
- `Payment.date`
- `PurchaseOrder.issueDate`, `ServiceOrder.issueDate`

## Search params soportados

| Param | Tipo | Valores |
|-------|------|---------|
| `range` | string | `this_month` (default), `last_month`, `last_30`, `last_90`, `this_year`, `custom` |
| `startDate` | YYYY-MM-DD | Solo si `range=custom` |
| `endDate` | YYYY-MM-DD | Solo si `range=custom` |
| `supplierId` | UUID | ID del proveedor activo |
| `origin` | string | `ORDEN_COMPRA`, `ORDEN_SERVICIO`, `MANUAL` |
| `status` | string | `POR_PAGAR`, `ADELANTO`, `COBRADO`, `CANCELADO` |
| `category` | string | Cualquier valor de `ExpenseCategory` enum |

Ejemplo de URL completa:
```
/reports?range=this_year&origin=ORDEN_COMPRA&status=POR_PAGAR&category=ESTAMPADO
```

## Filtros implementados

### Rango de fechas
- **Este mes** (`this_month`): 1er día del mes actual → hoy (default)
- **Mes anterior** (`last_month`): 1er al último día del mes anterior
- **Últimos 30 días** (`last_30`): hoy - 29 días → hoy
- **Últimos 90 días** (`last_90`): hoy - 89 días → hoy
- **Año actual** (`this_year`): 1 ene → hoy
- **Personalizado** (`custom`): `startDate` y `endDate` libres en inputs tipo `date`

### Proveedor
Populated desde `prisma.supplier.findMany({ where: { isActive: true } })`.
Se aplica a `CashMovement.supplierId`, `PurchaseOrder.supplierId`, `ServiceOrder.supplierId`.

### Origen
Filtro sobre `CashMovement.origin`. Para órdenes pendientes de caja: el filtro se aplica a nivel JS (ORDEN_COMPRA → oculta OS, ORDEN_SERVICIO → oculta OC, MANUAL/IMPORTADO → oculta ambas).

### Estado de pago
Filtro sobre `CashMovement.operationStatus`. Cuando se selecciona `POR_PAGAR`, la sección "Parciales activos" queda vacía (correcto: los movimientos POR_PAGAR no son ADELANTO).

### Categoría
Filtro sobre `CashMovement.category`. Cuando se selecciona una categoría, "Egresos por categoría" muestra solo esa categoría.

## Reglas de fecha aplicadas

| Fuente | Campo usado |
|--------|-------------|
| `CashMovement` | `date` |
| `Payment` | `date` |
| `PurchaseOrder` | `issueDate` |
| `ServiceOrder` | `issueDate` |

Los filtros se aplican en el `WHERE` de Prisma (no en JS) para eficiencia.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/data/reports.ts` | Agrega `ReportFilters`, `buildFilters()`, actualiza `getReportsData(filters?)`, agrega `supplierList` en `ReportsData` |
| `app/(app)/reports/page.tsx` | Lee `searchParams`, llama `buildFilters()`, pasa filtros al data layer y client |
| `components/reports-client.tsx` | Agrega `FilterBar` con `useState`/`useRouter`/`useTransition`, indicador de filtros activos, títulos dinámicos |
| `scripts/verify-report-filters.ts` | NUEVO — QA 49 checks |

## Arquitectura

```
URL params
  ↓
page.tsx (server component)
  → buildFilters(searchParams)   [pure computation]
  → getReportsData(filters)      [Prisma queries con WHERE dinámico]
  → <ReportsClient data={data} />

ReportsClient (client component)
  → <FilterBar filters={data.filters} supplierList={data.supplierList} />
    → useState (form state)
    → useRouter().push("/reports?...")  [aplica filtros]
    → server re-render automático
```

## Estado vacío

Cuando no hay datos para los filtros, cada sección muestra:
- "No se encontraron datos para los filtros seleccionados."
- "No hay cuentas pendientes para los filtros seleccionados."
- "No hay pagos parciales activos para los filtros seleccionados."
- "No hay órdenes pendientes para los filtros seleccionados."

Los gráficos muestran `EmptyState` en vez de chart vacío o error.

## Indicador de filtros activos

Debajo de la barra de filtros se muestra:
```
Periodo: 01 ene. 26 – 30 jun. 26 · 3 filtros activos
```

`activeCount` se incrementa por: range ≠ this_month, supplierId, origin, status, category.

## QA ejecutado (2026-06-28)

| Script | Resultado |
|--------|-----------|
| `verify-report-filters.ts` | ✓ 49/49 |
| `verify-management-reports.ts` (regresión 4B) | ✓ 10/10 |
| `verify-partial-payments.ts` (regresión 4A) | ✓ 22/22 |
| `verify-order-cashflow.ts` (regresión 3) | ✓ 27/27 |
| Lint | ✓ 0 errores |
| Build | ✓ Compiled successfully |
| Preview READY | ✓ dpl_FjxUQpqrZynxHS3dJzwdYhHfdNqL |

## Limitaciones

- **Paginación:** No hay paginación en tablas. Si hay muchos movimientos filtrados, puede ser lenta.
- **Filtro de proveedor en pagos:** La query de `Payment` filtra por `cashMovement.supplierId`. Requiere `JOIN` implícito que Prisma resuelve correctamente.
- **Custom date inputs:** Navegadores que no soporten `input[type=date]` mostrarán campos de texto.
- **Sin guardar filtros:** Los filtros no se persisten (no localStorage, no BD). El gerente debe compartir la URL completa.
- **Exportación:** Botones Excel/PDF siguen siendo placeholders (Fase 5).

## Siguiente fase recomendada

- **Fase 5:** Exportación real a Excel (`xlsx` o `exceljs`) con los filtros activos aplicados
- **Fase 4D (opcional):** Paginación en tablas con muchos registros
- **Fase 6:** Módulo de clientes y cuentas por cobrar
