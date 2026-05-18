-- ============================================================
-- StockMóveis — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Usuários (admin + vendedores)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller')),
  phone       TEXT,
  email       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_tabs TEXT[] NOT NULL DEFAULT ARRAY['dashboard','pdv']::TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  sku          TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  cost         NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 2,
  color        TEXT,
  size         TEXT,
  model        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES users(id),
  seller_name    TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  subtotal       NUMERIC(10,2) NOT NULL,
  discount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da venda
CREATE TABLE IF NOT EXISTS sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL,
  product_name TEXT NOT NULL,
  sku          TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) NOT NULL
);

-- Movimentações de estoque
CREATE TABLE IF NOT EXISTS stock_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL,
  product_name TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('in','out','adjustment')),
  quantity     INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Desabilitar RLS (sistema interno)
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE products         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales            DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items       DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  DISABLE ROW LEVEL SECURITY;

-- Usuário admin inicial
-- Senha: admin  →  SHA-256 = 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (username, password_hash, name, role, allowed_tabs)
VALUES (
  'admin',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'Administrador',
  'admin',
  ARRAY['dashboard','pdv','estoque','vendedores','relatorios']::TEXT[]
)
ON CONFLICT (username) DO NOTHING;
