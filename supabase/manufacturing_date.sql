-- Adds a manufacturing date to each PTAC unit. Shown/edited in
-- Settings → Unit Specifications and printed on labels under the serial number.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Stored as free text so real nameplate values (e.g. "2019-06", "06/2019",
-- "June 2019", or a full "2019-06-15") are all accepted as-is.
--
-- Until this runs, the app keeps working: unit reads use select("*") so the
-- missing column is simply absent, and trying to save a manufacturing date
-- shows a clear "run this SQL" message instead of failing silently.

ALTER TABLE ptac_units
  ADD COLUMN IF NOT EXISTS manufacturing_date text;
