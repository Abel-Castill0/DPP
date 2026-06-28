-- Migration: add_payment_fields
-- Applied manually via Supabase MCP (DIRECT_URL has pooler format, not suitable for migrate dev)

ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'EFECTIVO';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS operation_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by_id TEXT REFERENCES users(id);
