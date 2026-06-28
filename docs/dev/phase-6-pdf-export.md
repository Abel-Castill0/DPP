# Fase 6A — Exportación de reportes a PDF

Fecha de implementación: 2026-06-28  
Commit feature: 877f9a5  
Commit merge: 1445845  
Deploy producción: dpl_AoS7NJawfnNxU99ZDT1gYinjUFkt

## Objetivo

Permitir al gerente exportar los reportes gerenciales filtrados a un archivo `.pdf` directamente desde `/reports`, con los mismos filtros activos en pantalla que la exportación Excel.

## Archivos creados / modificados

| Archivo | Cambio |
|---------|--------|
| `lib/pdf/reports-pdf.ts` | NUEVO — función pura `generateReportsPdf(data: ReportsData)` |
| `app/api/reports/export-pdf/route.ts` | NUEVO — GET handler que devuelve `.pdf` |
| `components/reports-client.tsx` | Botón "Exportar PDF" habilitado; `buildExportUrl` acepta parámetro `endpoint` |
| `package.json` | Agrega `pdf-lib ^1.17.1` |

## Dependencia agregada

`pdf-lib ^1.17.1` — puro JavaScript, cero binarios nativos, compatible con Vercel serverless y Edge runtime. **No requiere** `serverExternalPackages`.

## Endpoint

```
GET /api/reports/export-pdf
```

Acepta los mismos search params que `/api/reports/export`:

| Param | Tipo | Descripción |
|-------|------|-------------|
| `range` | string | `this_month` (default), `last_month`, `last_30`, `last_90`, `this_year`, `custom` |
| `startDate` | YYYY-MM-DD | Solo si `range=custom` |
| `endDate` | YYYY-MM-DD | Solo si `range=custom` |
| `supplierId` | UUID | ID del proveedor |
| `origin` | string | `ORDEN_COMPRA`, `ORDEN_SERVICIO`, `MANUAL` |
| `status` | string | `POR_PAGAR`, `ADELANTO`, `COBRADO`, `CANCELADO` |
| `category` | string | Enum `ExpenseCategory` |

Responde con:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="dpp-reportes-YYYY-MM-DD.pdf"`
- `Cache-Control: no-store`

## Secciones del PDF (7)

| # | Sección | Contenido |
|---|---------|-----------|
| Header | — | Título "DPP CONTROL", subtítulo, fecha de generación |
| 0 | Periodo + filtros | Rango activo y filtros aplicados |
| 1 | Resumen ejecutivo | 4 KPI cards (por pagar, pagado, parciales, sin caja) |
| 2 | Cuentas por pagar | Tabla por proveedor con importe/abonado/pendiente |
| 3 | Pagos del periodo | Hasta 50 pagos del periodo con totales |
| 4 | Pagos parciales activos | % pagado por movimiento |
| 5 | Egresos por proveedor | Top 10 por egreso pagado |
| 6 | Egresos por categoría | Total + % del total |
| 7 | Órdenes sin caja | OC/OS sin movimiento de caja asociado |
| Footer | — | "DPP Control — Reporte Gerencial — Periodo" + paginación |

## Arquitectura

```
ReportsClient (client)
  → onClick: window.location.href = buildExportUrl(filters, "/api/reports/export-pdf")
     ↓ URL params (same as /reports filter state)

GET /api/reports/export-pdf?{params}
  → buildFilters(searchParams)   [pure, no DB]
  → getReportsData(filters)      [5 Prisma queries — reutilizado de Excel]
  → generateReportsPdf(data)     [pure, no DB — pdf-lib]
  → Response(buffer, { Content-Disposition: attachment })
     ↓ browser triggers download dialog
```

La función `generateReportsPdf(data: ReportsData)` en `lib/pdf/reports-pdf.ts` es **pura** (sin llamadas a DB), igual que `generateReportsWorkbook`. Esto permite testearla directamente sin levantar un servidor HTTP.

## Notas técnicas

### pdf-lib vs otras opciones

`pdf-lib` fue elegida sobre:
- `pdfkit` — requiere `serverExternalPackages`, streams Node.js
- `@react-pdf/renderer` — ~500KB, requiere React context completo
- `jspdf` — orientado a browser, dependencia de `canvas` en servidor

`pdf-lib` es puro JS/TS, sin binarios, sin Node.js built-ins, funciona en Edge y Lambda sin configuración adicional.

### Límite de pagos en PDF

La sección "Pagos del periodo" muestra hasta 50 registros. Si hay más, se agrega una nota: "… y N pagos más (ver exportación Excel para lista completa)". El Excel sigue sin límite de filas.

### buildExportUrl refactor

`buildExportUrl` en `reports-client.tsx` ahora acepta un segundo parámetro `endpoint` con valor por defecto `/api/reports/export`. Esto permite reutilizar la misma lógica de construcción de URL para PDF sin duplicar código.

### PDF en modo demo

Si no hay conexión a BD (`isDemo: true`), el PDF se genera correctamente con secciones vacías y mensajes "No hay datos…". El archivo es PDF 1.7 válido en cualquier caso.

## QA ejecutado (2026-06-28)

### Local
| Test | Resultado |
|------|-----------|
| Lint (`npm run lint`) | ✓ 0 errores |
| Build (`npm run build`) | ✓ Compiled — 19 rutas, TypeScript OK |
| `?range=this_month` (default) | ✓ 200, magic=`%PDF-` |
| `?range=this_year` | ✓ 200, magic=`%PDF-` |
| `?range=last_30` | ✓ 200, magic=`%PDF-` |
| `?origin=ORDEN_COMPRA` | ✓ 200, magic=`%PDF-` |
| `?status=POR_PAGAR` | ✓ 200, magic=`%PDF-` |
| `?category=ESTAMPADO` | ✓ 200, magic=`%PDF-` |
| `?range=custom&startDate=2000-01-01&endDate=2000-12-31` (vacío) | ✓ 200, magic=`%PDF-`, 2222 bytes |
| Validación visual (Opera GX) | ✓ Header, periodo, KPIs, 7 secciones, 1 página |
| Archivos .pdf commiteados | ✓ Ninguno |
| Secretos en git diff | ✓ Ninguno |

### Producción (dpp-pink.vercel.app)
| Test | Resultado |
|------|-----------|
| `/reports` | ✓ 200 |
| `/dashboard` | ✓ 200 |
| `/cash-flow` | ✓ 200 |
| `/purchase-orders` | ✓ 200 |
| `/service-orders` | ✓ 200 |
| `/suppliers` | ✓ 200 |
| `/items` | ✓ 200 |
| PDF `?range=this_month` | ✓ 200, `%PDF-`, 2197b |
| PDF `?range=this_year` | ✓ 200, `%PDF-`, 5365b (datos reales) |
| PDF `?range=last_30` | ✓ 200, `%PDF-`, 2229b |
| PDF `?origin=ORDEN_COMPRA` | ✓ 200, `%PDF-`, 2231b |
| PDF `?status=POR_PAGAR` | ✓ 200, `%PDF-`, 2235b |
| PDF `?category=ESTAMPADO` | ✓ 200, `%PDF-`, 2243b |
| PDF `?range=custom&startDate=2000-01-01&endDate=2000-12-31` | ✓ 200, `%PDF-`, 2221b |
| Content-Type PDF | ✓ `application/pdf` |
| Content-Disposition | ✓ `attachment; filename="dpp-reportes-2026-06-28.pdf"` |
| Cache-Control | ✓ `no-store` |
| Excel sin regresión (3 variantes) | ✓ 200, magic=`PK..` (XLSX) |
| Botón PDF funcional en `/reports` | ✓ Habilitado, mismo filtro que Excel |

## Limitaciones

- **Pagos del periodo:** máximo 50 filas en PDF. Excel muestra todos.
- **Sin gráficos:** el PDF omite los gráficos de barras (Recharts es client-only). Incluye las tablas equivalentes.
- **Fonts:** usa Helvetica / HelveticaBold (estándar PDF, sin embedding externo). Texto solo en ASCII — acentos (é, ó, etc.) están fuera del rango Helvetica estándar en pdf-lib y pueden mostrarse como caracteres de reemplazo en algunos visores.
- **Issue cosmético menor:** headers de sección tienen zero padding izquierdo interno. Texto readable pero toca el borde izquierdo de la barra de color.

## Siguiente fase

- **Fase 7 (sugerida):** Módulo de clientes y cuentas por cobrar
- **Fase 6B-fix (opcional):** Corregir acentos en PDF usando fuentes embebidas (font subsetting)
- **Fase 6C (opcional):** Padding en headers de sección + mejoras de diseño PDF
