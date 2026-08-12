-- PTAC Pro Tracker: user-editable dashboard location categories.
-- Run this once in Supabase → SQL Editor.
-- Until this table exists, the app just shows its built-in sections and the
-- "Manage Locations" screen will explain that the SQL needs to be run.
--
-- These are GENERIC location buckets (e.g. Elevator Closet, Rooftop). The
-- feature-tied locations — Maintenance Office and Doyle Shop — stay in code so
-- the PM/repair flow and the contractor portal can't be broken by an edit.

CREATE TABLE IF NOT EXISTS location_categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL,
  is_builtin boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE location_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_location_categories" ON location_categories;
CREATE POLICY "allow_all_location_categories" ON location_categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed the existing generic section so it's manageable from day one.
INSERT INTO location_categories (name, is_builtin, sort_order)
VALUES ('Elevator Closet', true, 0)
ON CONFLICT (name) DO NOTHING;
