/**
 * Create or update the admin user with a bcrypt-hashed password.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@dpp.pe ADMIN_PASSWORD=tu_contraseña npx tsx scripts/create-admin-user.ts
 *
 * Requires DATABASE_URL in .env.local (or environment).
 * Never commit real credentials — read them from environment variables only.
 */

import { existsSync } from "node:fs"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv")
// Load .env.local first (overrides .env), then fall back to .env
if (existsSync(".env.local")) dotenv.config({ path: ".env.local", override: true })
dotenv.config()
import bcrypt from "bcryptjs"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../lib/generated/prisma/client")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require("pg")

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const databaseUrl = process.env.DATABASE_URL

if (!email || !password || !databaseUrl) {
  console.error("Required env vars: ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL")
  process.exit(1)
}

const ssl = (databaseUrl as string).includes("supabase") ? { rejectUnauthorized: false } : undefined
const pool = new pg.Pool({ connectionString: databaseUrl, ssl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash(password as string, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, role: "ADMIN" },
    create: {
      email,
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  })

  console.log(`✓ Admin user upserted: ${user.email} (id: ${user.id}, role: ${user.role})`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((err: Error) => {
  console.error(err)
  process.exit(1)
})
