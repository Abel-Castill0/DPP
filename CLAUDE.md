@AGENTS.md

# DPP Control — Estado del proyecto

## Fase actual: 10 (en progreso — QA completo, pendiente preview) — siguiente: 11/13

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

## Reglas activas (Phase 10+)

- No tocar configuración Supabase/Vercel
- No modificar variables de entorno
- No hacer migrate reset
- No borrar datos reales
- No imprimir secretos
- No implementar gestión completa de usuarios (→ Phase 13)
- No implementar roles avanzados (→ Phase 13)
- No implementar importador Excel real (→ Phase 14+)
- No implementar IA

## Siguiente fase recomendada

- **Phase 11**: Mejoras de proveedores o módulo básico de insumos
- **Phase 12**: Módulo básico de cuentas por cobrar (KPIs "porCobrar"/"facturaVencidas")
- **Phase 13**: Gestión de usuarios desde UI (crear, editar rol, desactivar)
