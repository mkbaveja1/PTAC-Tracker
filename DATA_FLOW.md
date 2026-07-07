# PTAC Pro Tracker — Data Flow

## Overview

```
┌──────────────┐     fetch_*()      ┌──────────────┐
│   Streamlit  │ ◄──────────────── │   Supabase   │
│   View Page  │ ────────────────► │  PostgreSQL  │
└──────────────┘  insert/update    └──────────────┘
       │
       ▼
 st.session_state / st.rerun()
```

All reads and writes flow through `views/_shared.py` helpers (with a few direct Supabase calls in `unit_detail.py` and `directory.py`). There is no local database, cache layer, or offline queue.

---

## Data Sources

| Source | Tables | Used By |
|--------|--------|---------|
| Supabase `ptac_units` | Master inventory | All pages |
| Supabase `custody_transfers` | Movement audit trail | Unit detail history, Doyle dispatch notes |
| Supabase `pm_logs` | PM records | Unit detail history, analytics |
| Supabase `onsite_repairs` | Onsite repair costs | Unit detail history, analytics |
| Supabase `doyle_repairs` | Offsite repair records | Unit detail history, analytics, Doyle portal |
| External QR API | Generated images only | Unit detail, Avery labels |
| Streamlit secrets | Connection config | `app.py` |
| Request headers | Host for QR URLs | `app_base_url()` |

---

## API Calls (Supabase Operations)

### Read Patterns

Every page load triggers fresh reads. Example from dashboard:

```python
all_units = fetch_units()
# → SELECT ptac_id, serial_number, model_specs, current_location_name,
#          location_type, status, last_pm_date, created_at
#   FROM ptac_units ORDER BY ptac_id
```

Unit detail reads one unit plus all related logs:

```python
unit = fetch_unit(ptac_id)
transfers = fetch_transfers(ptac_id)
pm_logs = fetch_pm_logs(ptac_id)
onsite_repairs = fetch_onsite_repairs(ptac_id)
doyle_repairs = fetch_doyle_repairs(ptac_id)
```

### Write Patterns

#### Custody Transfer
```
1. Read current unit from fetch_units()
2. INSERT custody_transfers { ptac_id, from_location, to_location, technician_name, notes }
3. UPDATE ptac_units SET status, current_location_name, location_type WHERE ptac_id = ?
4. [If occupied override] UPDATE displacing unit → Maintenance Office first
```

Function: `update_unit_location()` in `_shared.py`

#### PM Log
```
1. [If not at Maintenance Office] update_unit_location() → Maintenance Office
2. INSERT pm_logs { ptac_id, technician_name, checklist booleans, diagnostic_notes }
3. UPDATE ptac_units SET last_pm_date = today WHERE ptac_id = ?
```

Implemented in: `render_pm_form()` in `unit_detail.py` (direct Supabase calls)

#### Onsite Repair
```
1. [If not at Maintenance Office] update_unit_location() → Maintenance Office
2. INSERT onsite_repairs { ptac_id, technician_name, parts_replaced, repair_cost, diagnostic_notes }
```

Implemented in: `render_repair_form()` in `unit_detail.py`

#### Spare Registration
```
INSERT ptac_units {
  ptac_id, serial_number, model_specs,
  current_location_name, location_type: "Spare", status: "Active"
}
```

Implemented in: `directory.py`

#### Doyle Repair Completion
```
1. [If returning to occupied room] update_unit_location(displacing unit → Maintenance Office)
2. INSERT doyle_repairs { ptac_id, sent_date, return_date, doyle_diagnosis, labor_cost, parts_cost, is_completed }
3. INSERT custody_transfers { from: Doyle Shop, to: target_location, notes }
4. UPDATE ptac_units SET status, location_type, current_location_name
```

Function: `complete_doyle_repair()` in `_shared.py`

#### Edit Specifications
```
UPDATE ptac_units SET model_specs, serial_number WHERE ptac_id = ?
```

#### Delete Unit
```
DELETE FROM ptac_units WHERE ptac_id = ?
```

---

## State Updates

### After Successful Write
All write paths end with `st.rerun()` to refresh the UI with live data.

Some helpers call `refresh_data()` which is a no-op (compatibility stub; caching was intentionally removed).

### Session State Changes

| Event | State Change |
|-------|--------------|
| Dashboard tile click | URL `?unit_detail=` → `selected_ptac_id` |
| Directory View/Action | `selected_ptac_id = ptac_id` |
| Scanner lookup success | `selected_ptac_id = parsed_id` |
| Analytics unit click | `selected_ptac_id = ptac_id` |
| Back to Board | Clear `selected_ptac_id`, clear query params, set page to Dashboard |
| Nav tab change | `clear_unit_detail_selection()` |
| Delete unit | Clear selection, redirect to Dashboard |
| Doyle completion | Clear `doyle_selected_ptac_id` |

### Derived State (computed each rerun)
- KPI counts (dashboard, analytics)
- Filtered unit lists (directory, avery)
- `display_status(unit)` — computed from location_type + status
- `active_unit_at_location()` — computed from full unit list
- History timeline — merged and sorted from multiple log tables

---

## Validation

### Client-side (Streamlit form validation)

| Action | Rules |
|--------|-------|
| Custody Transfer | Route selected; target location resolved; technician name required; occupied override confirmed if needed |
| PM Log | Technician required; all 4 checklist items must be checked |
| Onsite Repair | Technician required; diagnostic notes required |
| Edit Specs | Model and serial both required |
| Delete | Confirmation checkbox required |
| Spare Registration | Serial number required |
| Doyle Completion | Technician + invoice required; target room if direct deploy; occupied override if needed |

### Domain Validation

| Check | Function | Behavior |
|-------|----------|----------|
| Unit exists | `fetch_unit()` | Error message if not found |
| Occupied room | `active_unit_at_location()` | Warning + override checkbox |
| Valid scan input | `parse_scan_lookup()` | Returns normalized PTAC ID or None |
| Scan unit exists | Compare to `unit_ids` set | Error if no match |
| Transfer destination | `allowed_transfer_paths()` | Restricts route options by current state |
| Execute button disabled | `disabled=not target_location` | Prevents premature submit |

### No Server-side Validation Layer
Validation happens in Streamlit Python code immediately before Supabase writes. Database constraints (if any) would surface as Supabase errors — not currently handled with custom messages.

---

## Error Handling

### Startup Errors (`app.py`)
```python
try:
    supabase_secrets = st.secrets["supabase"]
except (KeyError, TypeError):
    st.error("Supabase secrets are not configured.")
    st.stop()
```

### Write Errors
- Most writes assume success; no try/except wrappers
- Doyle portal catches `ValueError("occupied_room_override_required")` specifically
- Missing unit: `st.error(f"No PTAC unit found for {ptac_id}")`

### RLS Errors
If Supabase returns `"new row violates row-level security policy"`, run `supabase/rls_policies.sql` in Supabase SQL Editor.

### QR / URL Errors
- Invalid scan: `st.error(f"No active profile matching \`{parsed_id}\`")`
- Localhost QR warning on unit detail when URL is not publicly reachable

---

## Loading States

**Streamlit default:** Full-page rerun spinner while script re-executes. No custom skeleton loaders or progress bars.

### Implicit Loading Behavior
1. User clicks button or submits form
2. Streamlit shows "Running..." spinner
3. Python executes (including Supabase calls)
4. Page re-renders with updated data

### No Explicit Loading Flags
There are no `st.session_state.is_loading` patterns. Long Supabase queries will block the rerun.

### Empty Data States
| Condition | UI |
|-----------|-----|
| No filtered directory results | "No PTAC units matched those search criteria." |
| No Doyle queue | "No dispatched jobs in repair queue." |
| No repair costs | `st.info("No repair costs logged yet.")` |
| No PM logs | `st.info("No PM logs found yet.")` |
| No Avery selection | `st.info("Choose at least one unit above to preview labels.")` |
| No unit history | "No history found for this unit yet." |

---

## Data Flow Diagrams

### Unit Detail Open Flow
```
User clicks tile/button OR scans QR
        │
        ▼
selected_ptac_id set (session or query param)
        │
        ▼
Active page checks get_selected_ptac_id()
        │
        ▼
render_unit_detail() → fetch_unit() + fetch_* logs
        │
        ▼
Display header, QR, actions, history
```

### Custody Transfer Flow
```
Open transfer dialog
        │
        ▼
Select route (outside form) → show room/corridor dropdown if needed
        │
        ▼
Check active_unit_at_location() → show override warning
        │
        ▼
Submit form → validate technician + override
        │
        ▼
[Optional] Displace occupying unit to Maintenance Office
        │
        ▼
update_unit_location() → INSERT transfer + UPDATE unit
        │
        ▼
st.rerun() → refreshed dashboard/directory/detail
```

### QR Deep Link Flow
```
Printed label QR encodes: https://app-url?unit_detail=PTAC-001
        │
        ▼
Browser opens URL → app.py reads query param
        │
        ▼
st.session_state.selected_ptac_id = "PTAC-001"
        │
        ▼
Default page (Dashboard) loads → detects selection → render_unit_detail()
```

---

## Performance Considerations

- **No caching** — every interaction re-fetches all needed tables
- **Full inventory fetch** — most pages call `fetch_units()` which loads all units
- **Acceptable scale** — ~125+ room units plus spares/hallways; fine for current inventory size
- **Future optimization** — if inventory grows significantly, add selective queries or caching with explicit invalidation on writes
