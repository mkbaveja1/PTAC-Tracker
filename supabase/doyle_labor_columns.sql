-- Doyle billing: split into parts + labor, where labor is two rates each with
-- its own hours (Total labor = rate1*hours1 + rate2*hours2). Adds the rate/hour
-- columns to doyle_repairs. Run once in Supabase → SQL Editor. Safe to re-run.
--
-- parts_cost, labor_cost, total_cost already exist; these store the breakdown.

ALTER TABLE doyle_repairs
  ADD COLUMN IF NOT EXISTS labor_rate1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_hours1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_rate2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_hours2 numeric NOT NULL DEFAULT 0;
