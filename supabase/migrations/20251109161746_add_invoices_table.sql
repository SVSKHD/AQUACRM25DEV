/*
  # Add Invoices Table to CRM

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `invoice_no` (text, unique)
      - `date` (date)
      - `customer_name` (text)
      - `customer_phone` (text)
      - `customer_email` (text)
      - `customer_address` (text)
      - `gst` (boolean, default false)
      - `po` (boolean, default false)
      - `quotation` (boolean, default false)
      - `gst_name` (text, nullable)
      - `gst_no` (text, nullable)
      - `gst_phone` (text, nullable)
      - `gst_email` (text, nullable)
      - `gst_address` (text, nullable)
      - `products` (jsonb)
      - `delivered_by` (text, nullable)
      - `delivery_date` (date, nullable)
      - `paid_status` (text: paid, partial, unpaid)
      - `payment_type` (text: cash, card, upi, bank_transfer)
      - `aquakart_online_user` (boolean, default false)
      - `aquakart_invoice` (boolean, default false)
      - `total_amount` (numeric, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on invoices table
    - Add policies for authenticated users to manage their own invoices
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_no text NOT NULL UNIQUE,
  date date NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  customer_address text NOT NULL,
  gst boolean DEFAULT false,
  po boolean DEFAULT false,
  quotation boolean DEFAULT false,
  gst_name text,
  gst_no text,
  gst_phone text,
  gst_email text,
  gst_address text,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivered_by text,
  delivery_date date,
  paid_status text NOT NULL DEFAULT 'unpaid',
  payment_type text NOT NULL DEFAULT 'cash',
  aquakart_online_user boolean DEFAULT false,
  aquakart_invoice boolean DEFAULT false,
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_status ON invoices(paid_status);