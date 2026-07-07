-- PTAC Pro Tracker: app-level settings (e.g. routine PM interval)
-- Run this once in Supabase → SQL Editor.
-- Until this table exists, the app falls back to the default (PM every 6 months)
-- and the settings control on Spending & PM Audits will show an error on save.

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_app_settings" ON app_settings;
CREATE POLICY "allow_all_app_settings" ON app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Default: routine PM twice a year (every 6 months)
INSERT INTO app_settings (key, value)
VALUES ('pm_interval_months', '6')
ON CONFLICT (key) DO NOTHING;
