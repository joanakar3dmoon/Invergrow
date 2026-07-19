-- InverGrow — Supabase Schema
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- Tabla principal de estado de la app
CREATE TABLE IF NOT EXISTS app_state (
  key         TEXT PRIMARY KEY,
  state       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Tabla de retiros del propietario (historial persistente)
CREATE TABLE IF NOT EXISTS owner_withdrawals (
  id            TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  amount        NUMERIC(12,2) NOT NULL,
  method        TEXT NOT NULL,        -- 'paypal' | 'card' | 'bank'
  destination   TEXT NOT NULL,        -- email, masked card, masked iban
  status        TEXT DEFAULT 'PENDING', -- 'PENDING' | 'COMPLETED' | 'FAILED'
  paypal_batch  TEXT,                 -- PayPal batch_id si aplica
  note          TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS owner_withdrawals_created_at_idx ON owner_withdrawals(created_at DESC);

-- Row Level Security desactivado (acceso solo desde server con service key)
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE owner_withdrawals DISABLE ROW LEVEL SECURITY;
