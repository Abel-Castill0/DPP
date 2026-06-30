@AGENTS.md

# DPP Control — Estado del proyecto

## Fase actual: 9 (completada) — siguiente: 10

## App

- Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui v4 (base-ui)
- Creada en `dpp-control/`

## Pantallas demo listas

- `/dashboard` — KPIs financieros y operacionales, gráfico mensual
- `/cash-flow` — Listado de movimientos con origen OC/OS/Manual
- `/cash-flow/new` — Formulario de nuevo movimiento
- `/suppliers` — Tabla de proveedores
- `/items` — Catálogo de insumos y servicios
- `/purchase-orders` — Listado de órdenes de compra
- `/purchase-orders/new` — Formulario nueva OC
- `/service-orders` — Listado de órdenes de servicio
- `/service-orders/new` — Formulario nueva OS
- `/reports` — Reportes disponibles (8 tipos)
- `/imports` — Importación de datos
- `/settings` — Configuración

## Arquitectura de datos

- Páginas de listado: async server components → `lib/data/*.ts` → Prisma con fallback demo
- Formularios: client components → server actions en `app/actions/*.ts`
- Sin DATABASE_URL: modo demo automático (datos de `lib/demo-data.ts`)
- Con DATABASE_URL: datos reales desde PostgreSQL

## Base de datos

- Prisma 7 con schema en `prisma/schema.prisma`
- Config en `prisma.config.ts` (Prisma 7 defineConfig)
- Cliente generado en `lib/generated/prisma/`
- Seed demo en `prisma/seed.ts`
- Ver `docs/dev/database-setup.md` para instrucciones

## Verificado

- Build: ✓ 0 errores TypeScript, 17 rutas estáticas
- Lint: ✓ 0 errores

## Reglas activas

- No usar datos reales ni montos reales del Excel en modo demo
- No implementar IA todavía
- No implementar auth real todavía (placeholder visual)
- No implementar importador Excel real todavía
- No hacer deploy todavía

## Siguiente fase (3)

- Flujo de caja real conectado a OC/OS (generar movimiento desde orden)
- Pagos parciales y liquidación de órdenes
- Formulario de pagos en OC/OS
- Dashboard 100% calculado desde BD
