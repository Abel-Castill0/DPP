# Hotfix — FK Constraint en creación de OC/OS

**Fecha:** 2026-06-28  
**Commit:** `84e7c85`  
**Deploy:** `dpl_6qfc77cWhjXDzLpEs8c9iCmkZ2n4` — dpp-pink.vercel.app  
**QA:** verify-order-create-forms 9/9 ✓ | QA autenticado producción 8/8 ✓

---

## Error original

```
Foreign key constraint violated on the constraint: service_orders_supplier_id_fkey
```

También se observaba: React error #418 (hydration) al cargar los formularios.

## Causa raíz

Los formularios `/purchase-orders/new` y `/service-orders/new` eran componentes cliente (`"use client"`) que importaban `demoSuppliers` de `lib/demo-data.ts`. Los IDs de demo son `"sup-1"`, `"sup-2"`, etc. — strings que no existen en la tabla `suppliers` de Supabase. Al enviar el formulario, el server action intentaba `prisma.purchaseOrder.create({ supplierId: "sup-2" })`, violando la FK.

Problema secundario: `useState(new Date().toISOString().slice(0, 10))` en un componente renderizado server-side produce hydration mismatch (React error #418) porque la fecha difiere entre SSR y cliente.

## Correcciones

### 1. Frontend — páginas como server components

`app/(app)/purchase-orders/new/page.tsx` y `app/(app)/service-orders/new/page.tsx` convertidos a async server components:

```tsx
export const dynamic = "force-dynamic"

export default async function NewPurchaseOrderPage() {
  const [suppliers, items] = await Promise.all([getSuppliers(), getItems()])
  const today = new Date().toISOString().slice(0, 10)
  return <NewPurchaseOrderForm suppliers={suppliers} items={items} today={today} />
}
```

La lógica de formulario se movió a `_components/new-purchase-order-form.tsx` y `_components/new-service-order-form.tsx`, que reciben `suppliers` (IDs reales de la BD) y `today` como props.

`getSuppliers()` usa `withDb()` — devuelve proveedores reales cuando `DATABASE_URL` está configurado, demo data como fallback. Los IDs reales son UUIDs de Supabase.

### 2. Backend — validación supplier antes de create

En `app/actions/purchase-orders.ts` y `app/actions/service-orders.ts`, antes de `prisma.purchaseOrder.create()`:

```typescript
const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { id: true } })
if (!supplier) return { error: "El proveedor seleccionado no existe. Recarga la página e intenta de nuevo." }
```

Esto añade defensa en profundidad: incluso si un ID inválido llega al backend, el error es descriptivo en lugar de un crash FK.

### 3. Fix React error #418

`today` se calcula una vez en el servidor y se pasa como prop string. El componente cliente usa `useState(today)` — el valor es idéntico entre SSR y hydration.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(app)/purchase-orders/new/page.tsx` | Server component — llama getSuppliers() + getItems() |
| `app/(app)/purchase-orders/new/_components/new-purchase-order-form.tsx` | Client form con props reales (nuevo) |
| `app/(app)/service-orders/new/page.tsx` | Server component — llama getSuppliers() |
| `app/(app)/service-orders/new/_components/new-service-order-form.tsx` | Client form con props reales (nuevo) |
| `app/actions/purchase-orders.ts` | +3 líneas: validación supplier.findUnique |
| `app/actions/service-orders.ts` | +3 líneas: validación supplier.findUnique |
| `scripts/verify-order-create-forms.ts` | QA script 9/9 (nuevo) |

## QA

```
verify-order-create-forms: 9/9 ✓
  ✓ supplier encontrado en BD
  ✓ user encontrado
  ✓ OC creada con proveedor válido
  ✓ OS creada con proveedor válido
  ✓ FK violation detectada con ID falso (prueba regresión)
  ✓ supplierId vacío rechazado por server action
  ✓ supplierId inválido rechazado por server action
  ✓ OC de prueba eliminada
  ✓ OS de prueba eliminada

QA autenticado producción 8/8 ✓ (login, 404, OC PDF, OS PDF, Excel, dashboard)
lint: 0 errors | build: clean | regresión: verify-order-pdfs 7/7, verify-order-cashflow 28/28, verify-report-export 31/31
```
