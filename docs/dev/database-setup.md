# Configuración de base de datos — DPP Control

## Fuente de credenciales

### Desarrollo local
Las credenciales reales se guardan en `.env.claude.local` (gitignored por `.env.*.local`).  
**Nunca commitear este archivo.**

```bash
# Verificar que está protegido:
git check-ignore -v .env.claude.local   # debe mostrar .gitignore:36
```

El archivo debe contener al menos:

```
DATABASE_URL="postgresql://..."    # Pooler Supabase, puerto 6543
DIRECT_URL="postgresql://..."     # Conexión directa, puerto 5432 (para migraciones)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."   # Solo backend — nunca en componentes cliente
```

### CI / Producción (Vercel)
Las variables se configuran como Environment Variables en el panel de Vercel.  
`.env` solo contiene comentarios — no tiene valores sensibles.

---

## Carga de variables

Prisma CLI detecta `.env.claude.local` automáticamente (desde Prisma 7).  
La app Next.js NO carga `.env.claude.local` automáticamente.  
`prisma.config.ts` lo carga explícitamente cuando existe.

---

## Obtener URLs de Supabase

1. Ir a https://supabase.com → tu proyecto
2. **Settings → Database → Connection string**
3. Copiar:
   - **Transaction mode** (puerto 6543) → `DATABASE_URL`
   - **Session mode** o **Direct connection** (puerto 5432) → `DIRECT_URL`
4. Si el proyecto está **pausado**: Dashboard → Settings → General → **Unpause project**

### Verificar conectividad antes de migrar

```bash
node -e "
require('dotenv').config({ path: '.env.claude.local' });
const net = require('net');
const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
const s = new net.Socket();
s.setTimeout(5000);
s.connect(parseInt(url.port)||5432, url.hostname, ()=>{console.log('REACHABLE');s.destroy()});
s.on('error', e=>console.log('UNREACHABLE:',e.code));
"
```

---

## Comandos

```bash
# 1. Generar cliente Prisma (no requiere BD)
npx prisma generate

# 2. Primera migración (requiere DIRECT_URL en .env.claude.local)
npx prisma migrate dev --name init_phase2

# 3. Seed demo (requiere DATABASE_URL)
npm run db:seed

# 4. Verificar conexión y CRUD mínimo
npx tsx scripts/verify-db.ts

# 5. Prisma Studio (explorador visual)
npx prisma studio

# 6. Reset completo (borra todos los datos)
npm run db:reset && npm run db:seed
```

---

## Modo demo (sin BD)

Si `DATABASE_URL` no está configurado, la app usa `lib/demo-data.ts`:
- Los listados muestran datos de ejemplo con badge "DEMO"
- Los formularios muestran mensaje informativo al guardar
- El build estático funciona completamente sin BD

En producción, si DATABASE_URL está configurado pero la BD falla, `withDb()` lanza el error en lugar de hacer fallback silencioso.  
En desarrollo, `withDb()` loggea un warning controlado y usa demo data.

---

## Variables de entorno — reglas de seguridad

| Variable | Dónde va | Nunca en... |
|----------|----------|-------------|
| `DATABASE_URL` | `.env.claude.local`, Vercel | Código fuente, Git |
| `DIRECT_URL` | `.env.claude.local`, Vercel | Código fuente, Git |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo server actions/API routes | Componentes cliente, `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe en cliente | Git commit (aunque riesgo bajo) |

---

## Pendiente

- [ ] Unpause o recrear proyecto Supabase (hostnames ENOTFOUND en verificación 2026-06-27)
- [ ] Auth real con Supabase Auth (Fase 4)
- [ ] Row Level Security (RLS) antes de producción
- [ ] Backup automatizado
- [ ] Variables de entorno en Vercel para deploy
