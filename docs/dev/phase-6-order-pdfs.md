# Phase 6 — PDF de Órdenes de Compra y Servicio

**Estado:** ✅ Completado — preview deploy pendiente  
**Rama:** `phase-6-order-pdfs` — commit `04e4689`  
**Fecha:** 2026-06-28

---

## Objetivo

Generar PDFs individuales para Órdenes de Compra (OC) y Órdenes de Servicio (OS), descargables desde la tabla de listado, protegidos por autenticación.

---

## Endpoints implementados

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/purchase-orders/[id]/pdf` | GET | Cookie `dpp-session` | PDF OC en formato A4 |
| `/api/service-orders/[id]/pdf` | GET | Cookie `dpp-session` | PDF OS en formato A4 |

Ambos retornan:
- **401** si no hay sesión válida
- **503** si no hay `DATABASE_URL` (modo demo)
- **404** si la orden no existe o está anulada (`isVoid: true`)
- **200 + PDF** con `Content-Type: application/pdf`, `Content-Disposition: inline`

---

## Archivos creados / modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/pdf/order-pdf.ts` | CREADO | Generador compartido OC y OS — pdf-lib A4 |
| `app/api/purchase-orders/[id]/pdf/route.ts` | CREADO | Route handler OC |
| `app/api/service-orders/[id]/pdf/route.ts` | CREADO | Route handler OS |
| `components/purchase-orders-client-page.tsx` | MODIFICADO | Botón PDF por fila |
| `components/service-orders-client-page.tsx` | MODIFICADO | Botón PDF por fila |
| `scripts/verify-order-pdfs.ts` | CREADO | QA — generación local + endpoints HTTP |

---

## Diseño del PDF (formato A4)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  DPP CONTROL                   ORDEN DE COMPRA      │  ← barra azul accent
│  Diseño Punto y Plano S.A.C.   OC-2026-001          │
└─────────────────────────────────────────────────────┘
                                        Lima, 28/06/2026

Proveedor:    Textiles Lima SAC      Estado:      Emitida
RUC:          20123456789            Pago:        Pendiente
Responsable:  Admin DPP              F. Emisión:  28/06/2026
                                     F. Esperada: 05/07/2026

────────────────────────────────────────────────────────
DETALLE DE ÍTEMS
#  Descripción              Cant.    Unid.  P. Unit.  Subtotal
1  Tela jersey blanca 30/1  100.000  MTS    S/ 12.50  S/ 1,250.00

                         Total orden:      S/ 1,250.00
                         Pagado:           S/ 0.00
                         ──────────────────────────
                         SALDO PENDIENTE:  S/ 1,250.00

Notas: (si las hay)

___________________          ___________________
Admin DPP                    Proveedor / Taller
Responsable DPP              Firma / sello de conformidad

────────────────────────────────────────────────────────
DPP Control — OC OC-2026-001 — 2026-06-28         Pág. 1 de 1
```

### Diferencias OC vs OS

| Campo | OC | OS |
|-------|----|----|
| Título | ORDEN DE COMPRA | ORDEN DE SERVICIO |
| Proceso | — | Proceso: Confección |
| N° Proforma | — | N° Proforma: PRF-2026-001 |
| Estilo | — | Estilo: ST-001 — Polo Básico |
| Sección ítems | "DETALLE DE ÍTEMS" | "CONCEPTOS DE SERVICIO" |
| Footer | `OC OC-...` | `OS OS-...` |

---

## Librería PDF

Se reutilizó `pdf-lib` (ya instalado desde Fase 6A para el reporte gerencial). No se agregaron dependencias nuevas.

Patrón de diseño: contexto mutable `Ctx` con cursor vertical `y` + helpers `drawText`, `drawLine`, `drawFilledRect`, `moveDown`, `ensureSpace` (agrega nueva página si no hay espacio). Todos los textos son posicionados con coordenadas absolutas (sistema PDF: y=0 en la parte inferior).

---

## UI — Botón "PDF"

Columna "PDF" agregada al final de las tablas en `/purchase-orders` y `/service-orders`. Es un `<a href="..." target="_blank">` con icono `FileDown` de lucide-react.

- **Solo visible en modo BD** (`isDemo === false`)
- Al hacer clic abre el PDF directamente en el navegador (tab nuevo)
- La cookie de sesión se envía automáticamente (same-site)

---

## Numeración de órdenes

Los campos `orderNumber` (`PurchaseOrder` y `ServiceOrder`) son `String @unique` con valores libres. En los PDFs se usan tal cual.

**Recomendación para Phase 6B:** implementar secuencias automáticas con formato `OC-YYYY-NNN` y `OS-YYYY-NNN` via una tabla auxiliar de contadores o una secuencia PostgreSQL, para garantizar unicidad sin colisiones concurrentes.

---

## QA — verify-order-pdfs.ts

```
── Local PDF generation ─────────────────────────────────
  [OC con ítems]     ✓  2710 bytes  magic: %PDF-
  [OC sin ítems]     ✓  2311 bytes
  [OC con notas]     ✓  2810 bytes
  [OS con estilo]    ✓  2962 bytes
  [OS mínimo]        ✓  2302 bytes

── HTTP endpoint tests (producción) ────────────────────
  [OC /pdf sin auth] ✓  401 No autorizado
  [OS /pdf sin auth] ✓  401 No autorizado

✓ Todos los tests pasaron.
```

### QA autenticado (pendiente post-merge a producción)

| Check | Esperado |
|-------|----------|
| Login → GET /api/purchase-orders/{id}/pdf | 200 + PDF (≥2000 bytes, magic %PDF-) |
| Login → GET /api/service-orders/{id}/pdf | 200 + PDF (≥2000 bytes, magic %PDF-) |
| UUID inexistente autenticado | 404 |
| Sin sesión | 401 |
| Logout → GET /api/purchase-orders/{id}/pdf | 401 |

---

## Git

| Commit | Rama | Descripción |
|--------|------|-------------|
| `04e4689` | `phase-6-order-pdfs` | `feat: generate purchase and service order PDFs` |
