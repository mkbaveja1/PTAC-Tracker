// Ported from views/_shared.py — room layout encodes the Hampton Inn property.
// Do not change FLOORS / ROOM_SUFFIXES without owner confirmation.

export const STATUSES = ["Active", "Needs PM", "Maintenance Office", "Doyle Shop"] as const;

export const LOCATION_TYPES = [
  "Room",
  "Hallway",
  "Elevator Closet",
  "Maintenance Office",
  "Doyle Shop",
  "Spare",
] as const;

export const FLOORS = [2, 3, 4, 5, 6] as const;

export const ROOM_SUFFIXES = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29,
] as const;

export const SPARE_STORAGE = "5th Floor Storage Closet";

// Doyle portal checklist (views/doyle.py)
export const CORE_COMPONENTS = [
  "Compressor",
  "Freon Recharge",
  "Fan Motor",
  "Relay Control",
  "Capacitor",
  "Solder Repair",
] as const;

// Default PM checklist items — used as the seed and as the fallback before the
// pm_checklist_items table is set up. Must match the seed in pm_checklist.sql.
export const DEFAULT_PM_TASKS = [
  "Filters washed / replaced",
  "Coils vacuumed & inspected",
  "Wiring & thermostat calibrated",
  "Blower fan centered & oiled",
] as const;

// Spare registration model choices (views/directory.py)
export const MODEL_OPTIONS = [
  "Amana PTAC12-Standard",
  "Amana PTAC15-Standard",
  "Amana PTAC15-HeavyDuty",
  "Amana PTAC09-Compact",
] as const;
