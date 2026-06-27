# Agent Access Setup — DPP Control

**Fecha de configuración:** 2026-06-27  
**Estado:** ✅ Activo

Documenta qué herramientas tiene Claude configuradas, qué puede hacer de forma autónoma, qué requiere confirmación explícita, y cómo mantener todo seguro.

---

## 1. Herramientas configuradas

### Playwright MCP
- **Paquete:** `@playwright/mcp@0.0.76` (global npm)
- **Chromium:** descargado en `%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-1226`
- **Config:** `%APPDATA%\Claude\claude_desktop_config.json` → `mcpServers.playwright`
- **Entry point:** `C:\Users\ABEL\AppData\Roaming\npm\node_modules\@playwright\mcp\cli.js`
- **Modo:** headless por defecto (Claude ve screenshots, tú no ves ventana)
- **Activación:** requiere reiniciar Claude Desktop para que el MCP se cargue

**Capacidades disponibles tras reinicio:**
- `browser_navigate` — navegar a cualquier URL
- `browser_screenshot` — capturar pantalla de la página actual
- `browser_click` / `browser_fill` — interactuar con formularios
- `browser_snapshot` — DOM snapshot para extraer datos
- `browser_wait_for` — esperar elementos o condiciones

### Vercel CLI
- **Versión:** 54.15.1 (`npx vercel`)
- **Token:** disponible en `.env.claude.local` como `VERCEL_TOKEN`
- **Estado del proyecto:** NO linkeado (el token pertenece a otro proyecto en Vercel)
- **Nota:** Para linkar DPP Control en Vercel, el token correcto debe venir del equipo/cuenta donde está deployado el proyecto

### Prisma CLI
- **Versión:** 7.8.0 (incluida en devDependencies)
- **Config:** `prisma.config.ts` — carga `.env.claude.local`, usa `DIRECT_URL` para migraciones
- **Seed:** configurado en `prisma.config.ts` → `migrations.seed: "npx tsx prisma/seed.ts"`
- **Comandos disponibles:** `generate`, `migrate dev`, `db seed`, `studio`

### Git + GitHub
- **Remote:** `https://github.com/Abel-Castill0/DPP.git`
- **Token:** `GITHUB_TOKEN` disponible en `.env.claude.local`
- **Rama principal:** `main`

---

## 2. Base de datos Supabase

### Estado (verificado 2026-06-27)
| Variable | Estado |
|----------|--------|
| `DATABASE_URL` | ✅ URL real configurada (direct connection, port 5432) |
| `DIRECT_URL` | ✅ URL real configurada (direct connection, port 5432) |
| Conectividad | ✅ REACHABLE — PostgreSQL 17.6 en Supabase |
| Migración `init_phase2` | ✅ Aplicada |
| Seed demo | ✅ 4 proveedores, 8 ítems, 3 OC, 2 OS, 3 movimientos caja |
| CRUD verificado | ✅ `scripts/verify-db.ts` — todas las tablas operativas |

### Cómo funciona la carga de credenciales
```
Prisma CLI    → lee .env.claude.local automáticamente (auto-detect Prisma 7)
Next.js app   → lee .env.local (creado manualmente desde .env.claude.local)
Scripts       → cargan .env.claude.local explícitamente con dotenv
```

**Archivos de credenciales (todos gitignored):**
- `.env.claude.local` — fuente de verdad local, todas las variables
- `.env.local` — subset con vars de BD para Next.js (DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_*)

### Variables detectadas en `.env.claude.local` (solo nombres)
`GITHUB_TOKEN`, `DATABASE_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `Secret_keys`, `CURRENT_KEY`, `Previous_key`, `LegacyJWTsecret`, `DATABASE_URL`, `DIRECT_URL`, `VERCEL_TOKEN`

---

## 3. Qué puede Claude hacer de forma autónoma

| Acción | Autónoma | Requiere confirmación |
|--------|:--------:|:--------------------:|
| Leer archivos del proyecto | ✅ | |
| Editar código (sin destructivo) | ✅ | |
| `npx prisma generate` | ✅ | |
| `npm run lint` | ✅ | |
| `npm run build` | ✅ | |
| `npm run dev` (arrancar local) | ✅ | |
| `npx tsx scripts/verify-db.ts` | ✅ | |
| `git add` + `git commit` | ✅ (cuando el usuario lo pide) | |
| Navegar la app con Playwright MCP | ✅ | |
| Tomar screenshots con Playwright | ✅ | |
| Probar formularios localmente | ✅ | |
| Corregir URLs de conexión en `.env.claude.local` / `.env.local` | ✅ | |
| `npx prisma migrate dev` | ✅ | |
| `npm run db:seed` | ✅ | |
| `git push` | | ✅ Confirmar antes |
| `npx vercel link` | | ✅ Confirmar antes |
| `npx vercel deploy` | | ✅ Confirmar antes |
| `npx vercel --prod` | | ✅ Confirmar antes |
| `npx prisma migrate reset` | | ✅ Confirmar antes (DESTRUCTIVO) |
| Borrar datos en producción | | ✅ Confirmar antes (DESTRUCTIVO) |
| Modificar RLS en Supabase | | ✅ Confirmar antes |
| Crear/borrar branches en Git | | ✅ Confirmar antes |

---

## 4. Cómo probar el navegador con Playwright MCP

**Prerrequisito:** reiniciar Claude Desktop para cargar el MCP.

### Flujo típico de prueba visual
```
1. Arrancar dev server:
   npm run dev   (en terminal separado, fuera de Claude)

2. Pedirle a Claude en la nueva sesión:
   "Abre http://localhost:3000/dashboard y toma un screenshot"
   "Navega a /suppliers y verifica que aparecen los proveedores reales"
   "Prueba el formulario /suppliers/new con datos de test"
```

### Con sesión persistente (Supabase/Vercel login)
Para recordar sesiones de login entre usos, agregar a `claude_desktop_config.json`:
```json
"args": [
  "C:\\Users\\ABEL\\AppData\\Roaming\\npm\\node_modules\\@playwright\\mcp\\cli.js",
  "--user-data-dir", "C:\\Users\\ABEL\\.playwright-mcp-profile"
]
```

---

## 5. Cómo probar Vercel

### Estado actual
El proyecto DPP Control **no está linkeado** a Vercel todavía. El `VERCEL_TOKEN` en `.env.claude.local` pertenece a otro proyecto ("avila-parfums").

### Para linkear (requiere confirmación)
```bash
# Primero, el usuario debe confirmar qué cuenta/team usar
npx vercel link --token <TOKEN_DPP> --yes --project dpp-control
npx vercel env pull .env.vercel.local   # descarga vars del proyecto Vercel
```

### Para deploy (requiere confirmación)
```bash
npx vercel --token <TOKEN> --yes          # preview deploy
npx vercel --prod --token <TOKEN> --yes   # producción — requiere confirmación explícita
```

---

## 6. Cómo probar Supabase

### Sin CLI (flujo actual — recomendado)
```bash
# Verificar conexión y CRUD mínimo
npx tsx scripts/verify-db.ts

# Migraciones
npx prisma migrate dev --name <nombre>

# Seed
npm run db:seed

# Studio (explorador visual)
npx prisma studio
```

### Con Supabase JS (para funciones específicas)
```ts
import { createClient } from '@supabase/supabase-js'
// NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY están en .env.local
```

### Management API (solo para operaciones admin)
Usar `SUPABASE_SERVICE_ROLE_KEY` — solo en server actions o scripts. Nunca en componentes cliente ni en variables `NEXT_PUBLIC_*`.

---

## 7. Cómo evitar exponer secretos

### Reglas activas
| Regla | Aplicación |
|-------|-----------|
| No imprimir valores de env vars | Solo mostrar nombres, prefijos cortos, longitudes |
| No commitear `.env.claude.local` | Gitignored por `.env.*.local` (línea 36 en `.gitignore`) |
| No commitear `.env.local` | Gitignored por `.env.local` (línea 35 en `.gitignore`) |
| `SUPABASE_SERVICE_ROLE_KEY` solo en server | Nunca en componentes cliente ni `NEXT_PUBLIC_*` |
| No hacer deploy sin confirmación | Especialmente `--prod` |
| No exponer tokens en logs | Usar variables de entorno, nunca hardcoded |
| No destructivo sin confirmación | `migrate reset`, borrar tablas, etc. |

### Verificar que los .env están protegidos
```bash
git check-ignore -v .env.claude.local   # debe mostrar línea 36
git check-ignore -v .env.local          # debe mostrar línea 35
git status                              # no deben aparecer como untracked
```

---

## 8. Comandos de referencia rápida

```bash
# Desarrollo
npm run dev                         # arranca en localhost:3000

# Base de datos
npx prisma generate                 # regenerar cliente
npx prisma migrate dev --name X     # nueva migración
npm run db:seed                     # seed demo
npx tsx scripts/verify-db.ts        # verificar CRUD completo
npx prisma studio                   # explorador visual (abre browser)

# Calidad
npm run lint                        # ESLint
npm run build                       # TypeScript + Next.js build

# Git
git add <archivos>                  # staging explícito (nunca git add -A con .env)
git commit -m "mensaje"
git push origin main                # pedir confirmación antes

# Playwright (requiere reinicio de Claude primero)
# Pedirle a Claude: "navega a http://localhost:3000/dashboard"
```

---

## 9. Estado al momento de configuración

| Item | Estado |
|------|--------|
| `@playwright/mcp` instalado | ✅ v0.0.76 |
| Chromium descargado | ✅ headless-shell-1226 |
| `claude_desktop_config.json` configurado | ✅ |
| Playwright activo en sesión actual | ⏳ Requiere reinicio de Claude |
| Supabase conectado | ✅ PostgreSQL 17.6 |
| Migraciones aplicadas | ✅ `20260627193546_init_phase2` |
| Seed ejecutado | ✅ datos demo en BD real |
| CRUD verificado | ✅ 7 tablas operativas |
| Lint | ✅ 0 errores |
| Build | ✅ 19 rutas estáticas, 0 errores TS |
| Vercel linkeado | ❌ Pendiente (token de otro proyecto) |
| Deploy productivo | ❌ Pendiente (no hacer sin confirmación) |
