# Fase 2.5 — Verificación real del estado de BD y CRUD mínimo

**Fecha de verificación:** 2026-06-27 (actualizado 2026-06-27 — Supabase conectado)
**Commit base:** `a999715` (phase 2.5 + supabase connection)

---

## 1. Estado real de base de datos

| Variable      | Estado                                                    |
|---------------|-----------------------------------------------------------|
| `.env.claude.local` | ✅ Existe y está gitignored (.env.*.local)        |
| Variables encontradas | DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VERCEL_TOKEN, GITHUB_TOKEN, y otras |
| DATABASE_URL  | ✅ Configurado (Supabase pooler)                          |
| DIRECT_URL    | ✅ Configurado (conexión directa para migraciones)        |
| Conectividad DB | ❌ ENOTFOUND — hostnames DNS no resuelven                |
| Migraciones   | ❌ BLOQUEADO (servidor no alcanzable)                     |
| Seed          | ❌ BLOQUEADO (requiere migración previa)                  |

### Error exacto al intentar conectar

```
UNREACHABLE: ENOTFOUND
```

Ambas URLs (`DATABASE_URL` y `DIRECT_URL`) fallan con `ENOTFOUND` — el nombre DNS del proyecto Supabase no resuelve. Posibles causas:

- El proyecto Supabase está **pausado** (free tier se pausa tras 7 días de inactividad)
- El proyecto fue **eliminado o recreado** con otro Project Ref
- Las URLs en `.env.claude.local` están desactualizadas

### Cómo resolverlo

1. Ir a https://supabase.com → Dashboard → tu proyecto
2. Si dice "Project paused" → click en **Restore project**
3. Ir a **Settings → Database → Connection string**
4. Copiar URLs actualizadas y reemplazar en `.env.claude.local`
5. Verificar conectividad:
   ```bash
   node -e "require('dotenv').config({path:'.env.claude.local'}); require('net').createConnection(5432, new URL(process.env.DIRECT_URL).hostname).on('connect',()=>console.log('OK')).on('error',e=>console.log(e.code))"
   ```
6. Una vez alcanzable: `npx prisma migrate dev --name init_phase2`
7. Luego: `npm run db:seed`

---

## 2. Cambios realizados en esta fase

### `prisma.config.ts`
- Carga `.env.claude.local` explícitamente con prioridad sobre `.env`
- Usa `DIRECT_URL` para migraciones (bypasa PgBouncer), con fallback a `DATABASE_URL`

### `lib/prisma.ts`
- Agrega `withDb()` helper: fallback controlado en dev, throw en producción
- En build phase (`NEXT_PHASE=phase-production-build`): siempre usa demo data
- No imprime URLs ni secretos en ningún caso

### `lib/data/*.ts`
- Todos migrados a usar `withDb()` en lugar de try/catch manual
- Comportamiento idéntico pero más consistente y seguro en producción

### `prisma/seed.ts`
- Carga `.env.claude.local` al inicio
- Falla con error claro si `DATABASE_URL` no está configurado

### `.env`
- DATABASE_URL **eliminado** — estaba apuntando a localhost:5432 inexistente
- `.env` ahora solo contiene comentarios explicativos
- Las credenciales reales van solo en `.env.claude.local` o como vars de Vercel

### `scripts/verify-db.ts`
- Script de QA para verificar conexión, conteo de tablas y CRUD básico
- Se auto-limpia: borra los registros QA que crea
- Ejecutar: `npx tsx scripts/verify-db.ts`

---

## 3. Tabla de estado por módulo

### Páginas de listado

| Página            | Lee desde Prisma | Fallback demo | Estado actual |
|-------------------|:-:|:-:|---------------|
| `/dashboard`      | ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/cash-flow`      | ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/suppliers`      | ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/items`          | ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/purchase-orders`| ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/service-orders` | ✅ via `withDb` | ✅ | Demo (sin BD) |
| `/reports`        | ❌ | ✅ | Solo visual   |
| `/imports`        | ❌ | ✅ | Solo visual   |
| `/settings`       | ❌ | ✅ | Solo visual   |

### Formularios de creación (todos implementados)

| Formulario               | Action | Página | Conectado a BD |
|--------------------------|:------:|:------:|:-:|
| `/suppliers/new`         | ✅ | ✅ | ⏳ Requiere BD |
| `/items/new`             | ✅ | ✅ | ⏳ Requiere BD |
| `/purchase-orders/new`   | ✅ | ✅ | ⏳ Requiere BD |
| `/service-orders/new`    | ✅ | ✅ | ⏳ Requiere BD |
| `/cash-flow/new`         | ✅ | ✅ | ⏳ Requiere BD |

---

## 4. Lo que SÍ se verificó

| Verificación                         | Resultado |
|--------------------------------------|-----------|
| `npx prisma generate`                | ✅ Cliente 7.8.0, 13 vars de .env.claude.local |
| `npm run lint`                       | ✅ 0 errores |
| `npm run build`                      | ✅ 0 errores TS, 19 rutas estáticas |
| `.env.claude.local` gitignored       | ✅ Confirmado con `git check-ignore` |
| Variables detectadas (solo nombres)  | ✅ 13 variables encontradas |
| Conectividad DATABASE_URL            | ✅ REACHABLE (PostgreSQL 17.6) |
| Conectividad DIRECT_URL              | ✅ REACHABLE (port 5432 directo) |

---

## 5. Verificado tras conectar Supabase (2026-06-27)

| Acción | Resultado |
|--------|-----------|
| Migración `init_phase2` | ✅ Aplicada exitosamente |
| `npm run db:seed` | ✅ 4 proveedores, 8 ítems, 3 OC, 2 OS, 3 movimientos |
| `npx tsx scripts/verify-db.ts` | ✅ 7 tablas, CRUD completo, auto-limpieza OK |
| App local con datos reales | ✅ `isDemo: false`, 13/13 rutas HTTP 200 |

### Diagnóstico de las URLs placeholder
Las URLs originales en `.env.claude.local` eran literalmente `postgresql://...` (placeholders, no reales).  
Se reconstruyeron correctamente usando `NEXT_PUBLIC_SUPABASE_URL` + `DATABASE_PASSWORD`:
- `DIRECT_URL` = `postgresql://postgres:[pass]@db.[project-ref].supabase.co:5432/postgres`
- `DATABASE_URL` = misma URL (direct connection para desarrollo; pooler opcional para producción)

---

## 6. Comandos verificados y operativos

```bash
# Verificar conexión y CRUD mínimo
npx tsx scripts/verify-db.ts   # ✅ todos los ✅ tras conectar

# Migrar
npx prisma migrate dev --name init_phase2   # ✅ aplicada

# Seed
npm run db:seed   # ✅ datos demo en BD real

# Studio
npx prisma studio   # explorador visual
```
