import { existsSync } from "node:fs"
import { config as dotenvConfig } from "dotenv"
import { defineConfig } from "prisma/config"

// Load .env.claude.local first if it exists (local override with real credentials).
// This file is gitignored via .env.*.local — never committed.
// Falls back to .env for CI/production environments.
if (existsSync(".env.claude.local")) {
  dotenvConfig({ path: ".env.claude.local", override: true })
} else {
  dotenvConfig()
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL bypasses the Supabase connection pooler (PgBouncer).
    // Migrations require a direct connection — PgBouncer can't handle DDL transactions.
    // Falls back to DATABASE_URL if DIRECT_URL is not set (local PG without pooler).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
})
