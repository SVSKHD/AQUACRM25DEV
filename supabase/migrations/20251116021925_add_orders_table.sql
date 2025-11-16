/*
  # Add Orders Table

  ## Overview
  Creates a comprehensive orders table for tracking customer orders in the CRM system.

  ## Tables Created
    - `orders`
      - `id` (uuid, primary key) - Unique order identifier
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `order_no` (text, unique) - Order number (e.g., ORD-001)
      - `date` (date) - Order date
      - `customer_name` (text) - Customer's full name
      - `customer_phone` (text) - Customer's phone number
      - `customer_email` (text) - Customer's email address
      - `customer_address` (text) - Customer's delivery address
      - `products` (jsonb) - Array of products in the order
      - `total_amount` (numeric) - Total order amount
      - `status` (text) - Order status: pending, processing, shipped, delivered, cancelled
      - `payment_status` (text) - Payment status: unpaid, partial, paid
      - `payment_type` (text) - Payment method: cash, card, upi, bank_transfer
      - `delivery_date` (date, nullable) - Expected delivery date
      - `notes` (text, nullable) - Order notes or special instructions
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  ## Security
    - Enable RLS on orders table
    - Add policies for authenticated users to manage their own orders
    - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Indexes
    - Index on user_id for efficient user-based queries
    - Index on order_no for quick order lookups
    - Index on date for date-based filtering
    - Index on status for status-based filtering
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_no text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  customer_address text NOT NULL,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_type text NOT NULL DEFAULT 'cash',
  delivery_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);