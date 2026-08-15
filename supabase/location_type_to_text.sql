-- Required for custom Manage-Locations categories.
-- ptac_units.location_type is a fixed enum (asset_location_type), so custom
-- category names like "Gym" can't be stored. This converts the column to free
-- text, preserving every existing value. Run once in Supabase → SQL Editor.
--
-- Safe to run more than once (a text column stays text).

ALTER TABLE ptac_units
  ALTER COLUMN location_type TYPE text USING location_type::text;
