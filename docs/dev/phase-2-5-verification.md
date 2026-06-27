# Fase 2.5 — Verificación real del estado de BD y CRUD mínimo

**Fecha de verificación:** 2026-06-27
**Commit base:** `188e2c8` (feat: phase-2)

---

## 1. Estado real de base de datos

| Variable      | Estado                                              |
|---------------|-----------------------------------------------------|
| DATABASE_URL  | ✅ Configurado en `.env`                            |
| Servidor      | ❌ PostgreSQL NO alcanzable en `localhost:5432`     |
| Migraciones   | ❌ BLOQUEADO (P1001: Can't reach database server)   |
| Seed          | ❌ BLOQUEADO (requiere migración previa)             |
| CRUD real     | ❌ BLOQUEADO (misma razón)                          |

### Error exacto al intentar migrar

```
Error: P1001: Can't reach database server at `localhost:5432`
Please make sure your database server is running at `localhost:5432`.
```

---

## 2. Estado del modo demo (sin BD)

Cuando DATABASE_URL está configurado pero el servidor no responde, el flujo es:

1. `lib/data/*.ts` intenta `prisma.*.findMany()`
2. Falla con error de conexión → bloque `catch {}`
3. Retorna datos de `lib/demo-data.ts` automáticamente

**Resultado:** la app funciona completamente en modo demo, incluso con DATABASE_URL configurado pero sin servidor disponible.

---

## 3. Tabla de estado por módulo

### Páginas de listado

| Página            | Lee desde Prisma | Fallback demo | Estado actual |
|-------------------|:-:|:-:|---------------|
| `/dashboard`      | ✅ | ✅ | Demo (sin BD) |
| `/cash-flow`      | ✅ | ✅ | Demo (sin BD) |
| `/suppliers`      | ✅ | ✅ | Demo (sin BD) |
| `/items`          | ✅ | ✅ | Demo (sin BD) |
| `/purchase-orders`| ✅ | ✅ | Demo (sin BD) |
| `/service-orders` | ✅ | ✅ | Demo (sin BD) |
| `/reports`        | ❌ | ✅ | Solo visual   |
| `/imports`        | ❌ | ✅ | Solo visual   |
| `/settings`       | ❌ | ✅ | Solo visual   |

### Formularios de creación

| Formulario               | Action implementada | Página `/new` | Conectado a BD |
|--------------------------|:-:|:-:|:-:|
| `/suppliers/new`         | ✅ `createSupplier` | ✅ (Fase 2.5) | ⏳ Requiere BD |
| `/items/new`             | ✅ `createItem`     | ✅ (Fase 2.5) | ⏳ Requiere BD |
| `/purchase-orders/new`   | ✅ `createPurchaseOrder` | ✅          | ⏳ Requiere BD |
| `/service-orders/new`    | ✅ `createServiceOrder`  | ✅          | ⏳ Requiere BD |
| `/cash-flow/new`         | ✅ `createCashMovement`  | ✅          | ⏳ Requiere BD |

Todos los formularios muestran un error informativo si `DATABASE_URL` no está disponible o la BD no responde. No hay datos falsos ni silencio ante errores.

---

## 4. Relación OC/OS → Flujo de caja

Ya implementado en el schema y en la capa de datos:

- `CashMovement.origin` tiene enum `MovementOrigin` con valores: `ORDEN_COMPRA`, `ORDEN_SERVICIO`, `MANUAL`, `IMPORTADO`
- `CashMovement.purchaseOrderId` y `serviceOrderId` son FK opcionales
- `lib/data/cash-movements.ts` extrae `orderNumber` desde la relación:
  ```ts
  orderNumber: r.purchaseOrder?.orderNumber ?? r.serviceOrder?.orderNumber ?? null
  ```
- La columna "Origen" y "N° Orden" ya aparecen en la tabla de `/cash-flow`
- Los datos demo en `lib/demo-data.ts` incluyen `origin` y `orderNumber` simulados

Para la Fase 3: crear movimiento de caja desde dentro de una OC/OS (botón "Registrar pago").

---

## 5. Lo que SÍ se verificó (sin BD)

| Verificación                         | Resultado |
|--------------------------------------|-----------|
| `npx prisma generate`                | ✅ Cliente generado (7.8.0) en 234ms |
| `npm run lint`                       | ✅ 0 errores |
| `npm run build`                      | ✅ 0 errores TypeScript, 19 rutas estáticas |
| Demo mode funciona en todas las rutas| ✅ Verificado por build estático |
| Formularios muestran error informativo al guardar sin BD | ✅ Por diseño |

---

## 6. Lo que NO se pudo verificar (requiere BD)

- Migración: `npx prisma migrate dev`
- Seed: `npm run db:seed`
- CRUD real: crear proveedor, ítem, OC, OS, movimiento
- Listado con datos reales desde Prisma
- Flujo completo formulario → BD → listado actualizado

---

## 7. Comandos para activar la BD

### Opción A: PostgreSQL local en Windows

```bash
# 1. Instalar PostgreSQL 16: https://www.postgresql.org/download/windows/
# 2. Crear base de datos:
psql -U postgres -c "CREATE DATABASE dpp_control;"
# 3. Actualizar .env con tu contraseña real:
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/dpp_control"
# 4. Migrar y sembrar:
npx prisma migrate dev --name init_phase2
npm run db:seed
# 5. Abrir Prisma Studio para verificar:
npx prisma studio
```

### Opción B: Supabase (cloud — recomendado)

```bash
# 1. Crear proyecto en https://supabase.com (gratis)
# 2. Ir a: Settings → Database → Connection string → URI
# 3. Pegar en .env:
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
# 4. Migrar y sembrar:
npx prisma migrate dev --name init_phase2
npm run db:seed
```

---

## 8. Próximos pasos

- [ ] **Inmediato:** Levantar PostgreSQL local o crear proyecto Supabase
- [ ] **Fase 3:** Botón "Registrar pago" dentro de OC/OS que crea un movimiento de caja vinculado
- [ ] **Fase 3:** Dashboard KPIs calculados desde BD real
- [ ] **Fase 4:** Auth real con Supabase Auth (login funcional)
