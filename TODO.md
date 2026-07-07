# PTAC Pro Tracker — TODO

## Completed Work

### Foundation
- [x] Streamlit app shell with custom horizontal navigation (`app.py`)
- [x] Supabase client initialization from secrets
- [x] Shared data/helper layer (`views/_shared.py`)
- [x] Domain constants (floors, rooms, statuses, location types)
- [x] Live uncached Supabase reads
- [x] RLS policy SQL script for all tables
- [x] `seed.py` — initial Hampton Inn PTAC inventory bootstrap in Supabase

### Dashboard (`views/dashboard.py`)
- [x] KPI cards (total, active, PM overdue, maintenance, Doyle)
- [x] Floor 2–6 room grid with suite 211 split
- [x] Color-coded status tiles with PM pulse animation
- [x] Support sections (hallways, elevator, maintenance, Doyle, spares)
- [x] Unit tile links to unit detail (`?unit_detail=`, same tab)
- [x] BTU labels on tiles

### Directory (`views/directory.py`)
- [x] Full inventory table with polished styling
- [x] Search across ID, serial, model, location, status
- [x] Location and status filters
- [x] Spare unit registration form
- [x] Auto `PTAC-###` ID assignment via `next_ptac_id()`
- [x] View/Action buttons → unit detail

### Unit Detail (`views/unit_detail.py`)
- [x] Hidden shared detail screen
- [x] QR code with full unit-detail URL
- [x] Status badge, location display
- [x] Modal dialogs for custody, PM, repair, edit, delete
- [x] Custody transfer with state-dependent destination lists
- [x] Dependent dropdowns outside form (immediate rerun)
- [x] Occupied-room override with displacement
- [x] Technician name validation (no prefilled defaults)
- [x] Combined history timeline (install, transfers, PM, repairs, Doyle)
- [x] Back to Board navigation

### Navigation & Deep Links
- [x] QR deep link support (`?unit_detail=PTAC-###`)
- [x] `clear_unit_detail_selection()` on tab/category change
- [x] `app_base_url()` with live host detection
- [x] `unit_detail_url()` for deployment-safe QR links
- [x] `parse_scan_lookup()` for URL or plain ID input

### Scanner (`views/scanner.py`)
- [x] Manual PTAC ID lookup
- [x] URL paste parsing
- [x] Routes to shared unit detail (no duplicate action forms)
- [x] Fallback unit selectbox

### Avery Labels (`views/avery.py`)
- [x] Batch filters (all, rooms, hallways, spares, maintenance, Doyle)
- [x] Checkbox selection with select all / clear all
- [x] 2×5 label sheet layout (Avery PLS-591PM-10)
- [x] QR codes encode `unit_detail_url(ptac_id)`
- [x] Multi-sheet pagination (10 labels per sheet)
- [x] Print preview via `components.html` with print trigger

### Analytics (`views/analytics.py`)
- [x] Repair spend KPIs with date window filter
- [x] PM compliance percentage
- [x] Active Doyle unit count
- [x] Top 10 highest repair expenses with bar chart
- [x] Doyle queue list
- [x] Recent PM logs
- [x] Clickable PTAC references → unit detail

### Doyle Portal (`views/doyle.py`)
- [x] Queue showing Doyle Shop units only
- [x] Repair entry form with component checklist
- [x] Return route (spare storage or guest room)
- [x] Occupied-room override on room return
- [x] `complete_doyle_repair()` integration
- [x] Dispatch note display from custody transfers

---

## Remaining Work

### High Priority

1. **Browser verification of navigation fix**
   - Confirm tab switching clears unit detail state
   - Confirm dashboard links stay in same tab
   - Confirm QR deep links still work after nav changes

2. **Deployment and QR base URL**
   - Deploy to Streamlit Community Cloud (or Render/Railway)
   - Set `[app].base_url` in secrets to public URL
   - Reprint Avery labels after deployment
   - Verify phone QR scanning reaches live app

3. **Doyle portal polish**
   - Stronger contractor UI isolation (hide hotel metrics)
   - Verify occupied-room displacement on all return paths
   - Align return-route logic fully with unit detail custody rules

### Medium Priority

4. **Analytics / Spending Audits polish**
   - Richer management summary sections
   - Export capability (CSV/PDF)
   - Clearer date labeling on repair rows
   - PM compliance trend over time

5. **Scanner camera integration**
   - Evaluate Streamlit-compatible QR camera component
   - Auto-route scan results to unit detail

6. **Avery label refinements**
   - Verify print margins on physical Avery PLS-591PM-10 sheets
   - Add model/specs text to label if missing from current layout

### Low Priority

8. **Authentication and roles**
   - Supabase Auth integration
   - Role-scoped RLS policies (hotel vs. Doyle)

9. **Automated PM status**
   - Cron/trigger to set `Needs PM` based on `last_pm_date` schedule

10. **Test suite**
    - Unit tests for `_shared.py` helpers
    - Integration tests against Supabase test project

---

## Bugs

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| B1 | Unit detail could persist when switching tabs (fixed in code; needs browser verification) | Medium | Fix implemented, verify |
| B2 | Localhost QR codes unreachable from phone scanners | High (local dev) | Expected; fix via deployment |
| B3 | Dashboard hero "Launch QR Scanner" pill is decorative (not linked) | Low | Open |
| B4 | `register_pm_log()` in `_shared.py` unused; PM writes duplicated in `unit_detail.py` | Low | Technical debt |
| B5 | Doyle repair stores `labor_cost: 0`, all cost in `parts_cost` | Low | By current design; verify reporting |

---

## Technical Debt

1. **Duplicated Supabase write logic** — PM and onsite repair in `unit_detail.py` bypass `_shared.register_pm_log()` / `register_onsite_repair()`
2. **Inline CSS in every view** — Consider `views/_styles.py` if CSS grows further
3. **Hardcoded hotel layout** — Floors, rooms, storage location names embedded in `_shared.py`
4. **No error handling on Supabase writes** — Failed inserts/updates not caught gracefully
5. **Permissive RLS** — All tables allow all operations; not suitable for public internet
6. **pandas dependency** — Only used in analytics; could use pure Python
7. **No README until this handoff** — Now addressed
8. **Streamlit UI** — Planned migration to React/Next.js on Vercel (see `PROJECT_OVERVIEW.md` future roadmap)

---

## High Priority Tasks (Action Order)

1. Deploy app and configure `app.base_url` in secrets
2. Browser-test navigation + unit detail clearing
3. Physical QR scan test with deployed URL
4. Polish Doyle portal occupied-room handling end-to-end
5. Link dashboard scanner pill to Smart QR Scanner page

---

## Nice-to-Have Enhancements

- Dark mode toggle
- Bulk custody transfer (multiple units at once)
- PM schedule calendar view
- Email digest for PM overdue units
- Unit photo upload (Supabase Storage)
- Barcode support in addition to QR
- Multi-property / multi-hotel support
- Offline mode with sync queue
- Dashboard auto-refresh interval
- Export directory to Excel
- Audit log viewer for all Supabase changes
- Integration with hotel work-order system
