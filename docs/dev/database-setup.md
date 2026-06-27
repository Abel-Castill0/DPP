# Configuración de base de datos — DPP Control

## Variables de entorno

Crea un archivo `.env` en la raíz de `dpp-control/` (nunca lo subas a git):

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/dpp_control"
```

Para Supabase (producción futura):
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJh..."
SUPABASE_SERVICE_ROLE_KEY="eyJh..."
```

## Comandos esenciales

```bash
# 1. Generar el cliente Prisma (siempre después de cambiar el schema)
npm run prisma:generate

# 2. Crear/aplicar migraciones (requiere DATABASE_URL configurado)
npm run prisma:migrate

# 3. Insertar datos demo
npm run db:seed

# 4. Abrir Prisma Studio (explorador visual de la BD)
npm run prisma:studio

# 5. Resetear la BD demo completa (¡borra todo!)
npm run db:reset
```

## Setup local completo (PostgreSQL)

```bash
# Instalar PostgreSQL si no está instalado:
# https://www.postgresql.org/download/windows/

# Crear la base de datos:
psql -U postgres -c "CREATE DATABASE dpp_control;"

# Configurar .env con la URL correcta
# Luego:
npm run prisma:migrate    # crea las tablas
npm run db:seed           # inserta datos demo
npm run prisma:studio     # verifica datos en el navegador
npm run dev               # inicia la app
```

## Sin base de datos (modo demo)

Si `DATABASE_URL` **no está configurado**, la app funciona en modo demo:
- Todas las páginas de listado muestran datos de ejemplo
- Los formularios no guardan datos (muestran error informativo)
- El badge "DEMO" es visible en la interfaz

No se necesita ninguna configuración adicional para correr la app en modo demo.

## Resetear datos demo localmente

```bash
npm run db:reset    # borra todas las tablas y migra desde cero
npm run db:seed     # vuelve a insertar datos demo
```

## Setup con Supabase (fase futura)

1. Crear proyecto en https://supabase.com
2. Obtener `DATABASE_URL` desde Settings → Database → Connection string
3. Configurar `.env` con la URL de Supabase
4. Ejecutar `npm run prisma:migrate` para crear las tablas en Supabase
5. Ejecutar `npm run db:seed` para insertar datos demo en Supabase

## Pendiente para fases siguientes

- [ ] Auth real con Supabase Auth o NextAuth
- [ ] Row-level security (RLS) en Supabase
- [ ] Migraciones automáticas en CI/CD
- [ ] Backup automatizado
- [ ] Variables de entorno en producción (Vercel / Railway)
