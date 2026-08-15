-- Editable PM checklist. Run once in Supabase → SQL Editor. Safe to re-run.
-- Until this runs, the PM dialog falls back to the four built-in items.

CREATE TABLE IF NOT EXISTS pm_checklist_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pm_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_pm_checklist_items" ON pm_checklist_items;
CREATE POLICY "allow_all_pm_checklist_items" ON pm_checklist_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed the existing four items.
INSERT INTO pm_checklist_items (label, sort_order) VALUES
  ('Filters washed / replaced', 0),
  ('Coils vacuumed & inspected', 1),
  ('Wiring & thermostat calibrated', 2),
  ('Blower fan centered & oiled', 3)
ON CONFLICT (label) DO NOTHING;

-- Store the completed item labels per PM log (JSON array), so history reflects
-- whatever the checklist was at the time.
ALTER TABLE pm_logs ADD COLUMN IF NOT EXISTS completed_tasks text;
