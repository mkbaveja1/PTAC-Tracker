-- Editable list of PTAC model options for the "Register New Unit" dropdown.
-- Run once in Supabase → SQL Editor. Safe to re-run. Until this runs, the
-- registration form uses the four built-in models.

CREATE TABLE IF NOT EXISTS model_options (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE model_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_model_options" ON model_options;
CREATE POLICY "allow_all_model_options" ON model_options
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO model_options (name, sort_order) VALUES
  ('Amana PTAC12-Standard', 0),
  ('Amana PTAC15-Standard', 1),
  ('Amana PTAC15-HeavyDuty', 2),
  ('Amana PTAC09-Compact', 3)
ON CONFLICT (name) DO NOTHING;
