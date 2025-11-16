/*
  # Add Payment Status to CRM Tables

  ## Overview
  Adds payment_status field to leads, customers, deals, activities, and products tables
  to enable filtering by COD (Cash on Delivery) and Paid status across all tabs.

  ## Changes Made
    
    ### Leads Table
    - Add `payment_status` column (text, default: 'pending')
    - Values: 'pending', 'cod', 'paid'
    
    ### Customers Table
    - Add `payment_status` column (text, default: 'pending')
    - Values: 'pending', 'cod', 'paid'
    
    ### Deals Table
    - Add `payment_status` column (text, default: 'pending')
    - Values: 'pending', 'cod', 'paid'
    
    ### Activities Table
    - Add `payment_status` column (text, default: 'pending')
    - Values: 'pending', 'cod', 'paid'
    
    ### Products Table
    - Add `payment_status` column (text, default: 'paid')
    - Values: 'pending', 'cod', 'paid'

  ## Notes
    - Uses IF NOT EXISTS pattern to safely add columns
    - Default value is 'pending' for all tables except products (which defaults to 'paid')
    - This enables filtering by payment status in all CRM tabs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE leads ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE activities ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE products ADD COLUMN payment_status text NOT NULL DEFAULT 'paid';
  END IF;
END $$;