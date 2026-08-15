// Row shapes matching the existing Supabase schema (see ARCHITECTURE.md).
// Table and column names must not change — downstream data depends on them.

export interface PtacUnit {
  ptac_id: string;
  serial_number: string | null;
  model_specs: string | null;
  current_location_name: string | null;
  location_type: string | null;
  status: string | null;
  last_pm_date: string | null;
  created_at: string | null;
}

export interface CustodyTransfer {
  transfer_id: number;
  ptac_id: string;
  from_location: string | null;
  to_location: string | null;
  technician_name: string | null;
  notes: string | null;
  transfer_date: string | null;
}

export interface PmLog {
  pm_id: number;
  ptac_id: string;
  technician_name: string | null;
  diagnostic_notes: string | null;
  filters_washed_replaced: boolean | null;
  coils_vacuumed_inspected: boolean | null;
  wiring_thermostat_calibrated: boolean | null;
  blower_fan_centered_oiled: boolean | null;
  date_performed: string | null;
}

export interface OnsiteRepair {
  repair_id: number;
  ptac_id: string;
  technician_name: string | null;
  parts_replaced: string | null;
  repair_cost: number | null;
  diagnostic_notes: string | null;
  repair_date: string | null;
}

export interface LocationCategory {
  id: number;
  name: string;
  is_builtin: boolean;
  enabled: boolean;
  sort_order: number;
  created_at?: string | null;
}

export interface DoyleRepair {
  doyle_id: number;
  ptac_id: string;
  sent_date: string | null;
  return_date: string | null;
  doyle_diagnosis: string | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost?: number | null;
  labor_rate1?: number | null;
  labor_hours1?: number | null;
  labor_rate2?: number | null;
  labor_hours2?: number | null;
  is_completed: boolean | null;
}
