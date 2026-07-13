CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY,
  prompt text NOT NULL,
  art_prompt text NOT NULL,
  style text NOT NULL,
  shape text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  design_id uuid NOT NULL REFERENCES designs(id),
  stripe_session_id text NOT NULL UNIQUE,
  pack_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'checkout_created',
  customer_email text,
  shipping_name text,
  shipping_address jsonb,
  printify_order_id text UNIQUE,
  tracking_url text,
  fulfillment_error text,
  fulfillment_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_design_id_idx ON orders(design_id);
