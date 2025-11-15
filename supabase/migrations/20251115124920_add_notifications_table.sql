/*
  # Add Notifications Table to CRM

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `message` (text)
      - `recipient_type` (text: selected, high_value, all)
      - `recipient_emails` (text array)
      - `min_purchase_amount` (numeric, nullable)
      - `sent_count` (integer, default 0)
      - `status` (text: draft, sent)
      - `sent_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for authenticated users to manage their own notifications
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'selected',
  recipient_emails text[] DEFAULT ARRAY[]::text[],
  min_purchase_amount numeric,
  sent_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
