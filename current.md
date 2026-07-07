# PTAC Pro Tracker Project Handoff

## Project Purpose

PTAC Pro Tracker is a Streamlit, Python, and Supabase application for managing the PTAC system at a Hampton Inn hotel. It is intended to become a live hotel operations console for tracking every PTAC unit across guest rooms, hallway corridors, the elevator closet, the maintenance office, Doyle offsite repair custody, and spare storage.

The main goal is to replace manual PTAC tracking with a database-backed workflow. Hotel staff should be able to see where every unit is, what condition it is in, when it was last serviced, which units need preventative maintenance, which units are at Doyle, and which spare units are available.

Supabase is the source of truth. Streamlit is the operations user interface. The app should write real custody changes, PM logs, onsite repairs, and Doyle repairs into Supabase instead of keeping important operational state only in the browser or in temporary Streamlit state.

## Current Architecture

### App Shell And Navigation

`app.py` is the main Streamlit entry point. It configures the page, initializes the Supabase client from `st.secrets`, stores that client in `st.session_state.supabase`, and controls top-level navigation.

The app uses a custom horizontal navigation layout instead of Streamlit's default sidebar. The current navigation has two main modes:

- `Hotel Operations View`
- `Contractor Portals`

The hotel operations mode contains:

- `Dashboard Grid`
- `Directory List`
- `Smart QR Scanner`
- `Avery Labels`
- `Spending Audits`

The contractor mode contains:

- `Doyle Tech Portal`

The actual Streamlit pages are mounted with `st.Page(...)` and `st.navigation(..., position="hidden")`, so the visible navigation is controlled by the custom segmented controls in `app.py`.

### Shared Data And Helper Layer

`views/_shared.py` is the shared helper/data layer. It centralizes logic that multiple pages need so each view does not duplicate Supabase fetches, room lists, status labels, QR URL logic, and common update operations.

It currently handles:

- Getting the Supabase client from Streamlit session state
- Fetching PTAC units from `ptac_units`
- Fetching one PTAC unit by `ptac_id`
- Fetching PM logs from `pm_logs`
- Fetching custody transfers from `custody_transfers`
- Fetching onsite repairs from `onsite_repairs`
- Fetching Doyle repairs from `doyle_repairs`
- Displaying spare units as `Spare/Storage`
- Converting model/spec text into BTU labels
- Building all guest room location options
- Building hallway/corridor options
- Inferring Supabase `location_type` from a destination name
- Inferring Supabase `status` from a destination name
- Detecting when a target room/location already has an active unit
- Generating the next `PTAC-###` ID for new spare units
- Styling dashboard status cells
- Moving a unit by writing `custody_transfers` and updating `ptac_units`
- Writing PM logs
- Writing onsite repair logs
- Building deployment-safe unit detail URLs through `app_base_url()` and `unit_detail_url()`

There is intentionally no caching in this shared layer. The project owner wanted live reads from Supabase without risking stale data.

### Hidden Unit Detail Screen

`views/unit_detail.py` is a hidden detail/action screen. It is not one of the main navigation tabs. It is reached from:

- Clicking a room/unit on the dashboard grid
- Clicking `View / Action` from the directory
- Scanning a QR code that points to `?unit_detail=PTAC-###`
- Future scanner lookups
- Future Avery label QR codes

This screen is the shared action surface for a single PTAC unit. It shows the unit's identity, QR tag, current location, location type, status, action buttons, and location/maintenance history.

The three main unit actions are:

- Custody transfer route
- Register routine PM
- Log onsite repair

These now open as modal dialogs instead of expanding inline underneath the action cards.

## Completed Work And Current State

### `seed.py` — complete

The initial Hampton Inn PTAC inventory seed script is **complete**. It created guest room units, hallway units, the elevator closet unit, and starting spare units in Supabase.

The seed data establishes the baseline layout of the Hampton Inn PTAC system so the app can display real inventory records from Supabase. Re-running seed is only needed if the database is wiped or a fresh environment is provisioned.

### `app.py`

The main app shell is complete enough for the current workflow.

It handles:

- Streamlit page configuration
- Supabase connection setup through `st.secrets["supabase"]["url"]` and `st.secrets["supabase"]["key"]`
- Persistent session state for `current_category` and `current_page`
- Top-level switching between hotel operations and contractor portal views
- Horizontal sub-navigation for individual hotel operation pages
- Hidden Streamlit page routing

Latest state: the navigation clearing fix has been implemented. `app.py` now has `clear_unit_detail_selection()`, and it clears `st.session_state.selected_ptac_id` plus `st.query_params` whenever the user changes the main category or sub-navigation page. This should allow users to leave a unit detail screen and go to Directory, Avery Labels, Spending Audits, Scanner, or Doyle normally.

### `views/dashboard.py`

The dashboard is the high-level hotel operations command center.

It currently handles:

- Pulling live PTAC inventory data through `fetch_units()`
- Showing KPI cards for:
  - Total inventory
  - Active and running
  - PM clean overdue
  - At maintenance office
  - At Doyle shop
- Displaying Floors 2 through 6 in ascending order
- Rendering room and suite PTAC units as color-coded cells
- Rendering hallway/corridor units in their own support section
- Rendering separate support sections for:
  - Elevator closet
  - Maintenance office onsite
  - Doyle repair shop
  - Spare storage closet
- Showing unit ID, location label, and BTU label on tiles
- Linking unit tiles to the shared unit detail screen
- Forcing dashboard unit links to open in the same browser tab with `target="_self"`

Dashboard status colors are driven by `dashboard_status_style()` in `_shared.py`.

### `views/directory.py`

The directory is the master inventory table view.

It currently handles:

- Pulling PTAC inventory records through `fetch_units()`
- Showing columns for:
  - ID
  - Specs and serial
  - Location
  - Operational status
  - Last PM check
  - Actions
- Searching by PTAC ID, serial number, model, location, location type, and status
- Filtering by location category
- Filtering by operational status
- Registering a new spare unit into the existing `ptac_units` table
- Assigning new spare IDs through `next_ptac_id()`
- Showing `View / Action` buttons for unit-level work

The directory page has been visually polished by the project owner and should preserve that table style unless specifically changed. `View / Action` now sets `st.session_state.selected_ptac_id`, which is the same selection state used by the shared hidden unit detail screen.

### `views/_shared.py`

The shared helper file has been added and is now the central place for app-wide reusable logic.

Important completed changes:

- Centralized Supabase fetch helpers
- Removed duplicate fetch logic from individual pages
- Added `fetch_unit()` for direct unit detail lookups
- Added `active_unit_at_location()` for occupied-room checks
- Added `app_base_url()` and `unit_detail_url()` for deployment-safe QR links
- Kept reads uncached by request
- Added shared update/write helpers for custody movement, PM logging, and onsite repair logging

This file should remain focused on domain/data helpers, not page-specific CSS.

### `views/unit_detail.py`

The hidden unit detail/action screen has been created.

It currently handles:

- Reading the selected PTAC ID from `st.query_params["unit_detail"]` or `st.session_state.selected_ptac_id`
- Fetching the selected unit from Supabase
- Showing a unit header with PTAC ID, model/specs, serial number, BTU label, and status badge
- Showing physical QR identification
- Showing current assigned location and location type
- Showing action cards for custody transfer, PM, and onsite repair
- Opening action forms as modal dialogs with `st.dialog`
- Showing a location history and maintenance feed by combining:
  - Installation/created date
  - Custody transfer logs
  - PM logs
  - Onsite repair logs
  - Doyle repair logs

The custody transfer modal currently supports different authorized destination lists depending on the unit's current state:

- Active room/hallway/elevator units can go to `Maintenance Office` or `Doyle Shop`
- Doyle units can go to `Spare Storage`, `Guest Room`, or `Maintenance Office`
- Maintenance office units can go to `Guest Room`, `Corridor/Hallway`, `Elevator Closet`, `Spare Storage`, or `Doyle Shop`
- Spare/storage units can go to `Guest Room`, `Corridor/Hallway`, `Elevator Closet`, `Maintenance Office`, or `Doyle Shop`

The transfer modal now reveals follow-up fields only when needed:

- Guest room destination shows guest room dropdown
- Corridor/hallway destination shows hallway dropdown
- Elevator closet destination does not show room choices

Latest state: the custody transfer destination selectors were moved outside the `st.form`. This was necessary because Streamlit form widgets do not trigger immediate reruns. With the selectors outside the form, choosing `Guest Room` can immediately reveal the room dropdown, choosing `Corridor/Hallway` can immediately reveal the hallway dropdown, and the Execute button only becomes usable after a real target destination exists.

The PM and repair modals no longer prefill technician name with `Hotel Maintenance`; they use placeholders and require a real technician name before submission.

### `views/scanner.py`

The scanner page currently has a first-pass manual workflow.

It can:

- Fetch units from Supabase
- Let the user type a PTAC ID manually
- Let the user select a PTAC ID from a dropdown
- Show a small unit preview
- Submit basic scanner actions:
  - Send to Maintenance
  - Send to Doyle
  - Mark PM Complete

This page is not complete. The intended final scanner workflow should route scans/lookups into the shared unit detail screen instead of duplicating action logic.

### `views/avery.py`

The Avery label page currently has a first-pass label preview.

It can:

- Fetch units from Supabase
- Filter label candidates by all units, rooms, hallways, or spares
- Select PTAC IDs to print
- Render a 2-column by 5-row sheet layout similar to Avery PLS-591PM-10
- Generate QR images through `api.qrserver.com`

This page is not complete. The QR payloads still need to be verified so they encode full unit detail URLs through `unit_detail_url(ptac_id)` rather than plain PTAC IDs.

### `views/analytics.py`

The analytics page currently has a first-pass audit view.

It can:

- Fetch units, onsite repairs, Doyle repairs, and PM logs
- Show accumulated repair spend
- Show average repair cost
- Show PM compliance
- Show highest repair expenses by PTAC
- Show active Doyle contractor shipments
- Show recent PM logs

This page is not complete. It needs more polished reporting, clearer management summaries, and links back into unit detail screens.

### `views/doyle.py`

The Doyle portal currently has a first-pass contractor workflow.

It can:

- Show only units with Doyle Shop status
- Let a Doyle tech select a dispatched PTAC
- Enter technician signature, invoice/work order reference, labor cost, parts cost, replaced components, extra parts, notes, and return route
- Write a Doyle repair record
- Write a custody transfer record
- Update the PTAC unit location/status

This page is not complete. It needs better isolation, cleaner UI, occupied-room handling when returning directly to a room, and tighter alignment with the shared unit detail lifecycle logic.

## Recent Changes Made After The Original Status Document

The project has moved beyond the original `current.md` snapshot. Major changes since then include:

- Added `views/_shared.py` as a central shared helper layer.
- Removed duplicate PTAC fetch logic from pages where possible.
- Added shared `fetch_units()` and `fetch_unit()` helpers.
- Added shared `active_unit_at_location()` for occupied-room checks.
- Added `app_base_url()` and `unit_detail_url()` for QR code destinations.
- Changed the unit detail QR code to encode a full unit detail URL instead of plain text like `PTAC-001`.
- Converted custody transfer, PM checklist, onsite repair, edit specifications, and delete forms into modal dialogs.
- Fixed custody transfer follow-up fields so only the relevant dropdown appears.
- Removed prefilled `Hotel Maintenance` values from PM and repair technician fields.
- Added validation requiring technician names for transfer, PM, and repair actions.
- Added occupied-room override notes into transfer notes before writing to Supabase.
- Moved custody-transfer route and destination dropdowns outside the submit form so dependent dropdowns render immediately.
- Disabled the `Execute Custody Transfer` button until a valid destination is selected.
- Added same-tab dashboard unit links with `target="_self"` to reduce accidental new-tab behavior.
- Added `clear_unit_detail_selection()` in `app.py` so changing app tabs clears active unit detail state.
- Confirmed Supabase write paths for the major actions:
  - Custody transfers write to `custody_transfers` and update `ptac_units`
  - PM logs write to `pm_logs` and update `ptac_units.last_pm_date` and `ptac_units.status`
  - Onsite repair logs write to `onsite_repairs`; if the unit is not already in Maintenance Office, it is first moved through a custody transfer
  - Doyle completion writes to `doyle_repairs`, writes to `custody_transfers`, and updates `ptac_units`

## Supabase Tables Currently Used

The current app uses existing Supabase tables. No additional required table has been introduced for the current implemented work.

Current mutation paths use:

- `ptac_units`
- `custody_transfers`
- `pm_logs`
- `onsite_repairs`
- `doyle_repairs`

Important note: spare units do not require a separate spare table. They are rows in `ptac_units` with `location_type = "Spare"` and a storage location such as `5th Floor Storage Closet`.

## Navigation Behavior And Remaining Risk

The hidden unit detail screen can be opened through either:

- `st.query_params["unit_detail"]`
- `st.session_state.selected_ptac_id`

This is useful for QR links and dashboard clicks. Previously, it caused a navigation issue: if the user was on a unit detail screen and clicked another tab such as `Directory List`, the new page could still render the unit detail screen because a selected unit was still active.

The implemented fix is:

- In `app.py`, whenever `selected_category` changes, clear `st.session_state.selected_ptac_id` and clear `st.query_params`.
- In `app.py`, whenever `selected_page` changes, clear `st.session_state.selected_ptac_id` and clear `st.query_params`.
- Keep `views/unit_detail.py` hidden from the navigation tabs.
- Continue using `?unit_detail=PTAC-###` for QR-code deep links.

This should allow normal tab navigation while preserving direct QR links into the hidden detail/action screen.

Remaining risk: if a browser still opens dashboard cells in new tabs, hard refresh the app first so the browser discards old rendered HTML. Dashboard links now include `target="_self"`, but any future custom HTML links should also avoid `target="_blank"`.

## Remaining Work

The remaining main app areas are:

1. Verify navigation/detail cleanup in the browser
2. Smart QR scanner screen
3. Avery label screen
4. Spending audits screen
5. Doyle contractor portal screen
6. Deployment and QR base URL setup

The pages already exist, but several are first-pass versions and still need to be brought up to the same quality level as the dashboard, directory, and unit detail workflows.

## Implementation Plan For Remaining Work

### 1. Verify Navigation And Unit Detail Cleanup

The core navigation/detail cleanup has been implemented. The next step is browser verification.

Implemented details:

- When `selected_category` changes:
  - Set `st.session_state.selected_ptac_id = None`
  - Clear `st.query_params`
  - Set the new category and default page
  - Rerun
- When `selected_page` changes:
  - Set `st.session_state.selected_ptac_id = None`
  - Clear `st.query_params`
  - Set the new page
  - Rerun
- Verify dashboard and directory can still open unit details.
- Verify QR URLs still open unit details directly.
- Verify dashboard unit clicks stay in the same browser tab.
- Verify changing tabs from unit detail no longer reopens unit detail.

### 2. Smart QR Scanner

The scanner should become a lookup gateway into the shared unit detail screen.

Planned behavior:

- Manual lookup by PTAC ID remains.
- Camera scanning can be added if a Streamlit-compatible component or custom JS component is practical.
- When a PTAC ID is found, the scanner should set `st.session_state.selected_ptac_id` or redirect to `?unit_detail=PTAC-###`.
- The scanner should not duplicate custody transfer, PM, or repair forms once unit detail is stable.
- The scanner page should show a clean status message if no matching unit is found.

Acceptance scenarios:

- Typing `PTAC-001` opens that unit's detail/action screen.
- Scanning a QR code that contains a unit detail URL opens the same screen.
- Invalid IDs show a helpful error and do not write to Supabase.

### 3. Avery Labels

The Avery label page should generate physical labels that technicians can scan in the field.

Planned behavior:

- Pull all PTAC units through `fetch_units()`.
- Filter by:
  - All units
  - Rooms
  - Hallways
  - Spares
  - Maintenance Office
  - Doyle Shop
- Allow selecting individual PTAC tags.
- Add select all shown and clear selection controls.
- Render 10 labels per sheet in a 2-column by 5-row layout.
- Each label should include:
  - PTAC ID
  - Current location
  - model/specs
  - serial number
  - QR code
- QR codes must encode `unit_detail_url(ptac_id)`.
- Browser print should produce the Avery-style sheet.

Acceptance scenarios:

- Selecting one unit produces one scannable label.
- Selecting more than 10 units creates multiple printable sheets.
- Scanning a printed label opens that unit's detail/action screen.

### 4. Spending Audits

The spending audits page should become the management reporting screen.

Planned behavior:

- Pull from `ptac_units`, `pm_logs`, `onsite_repairs`, and `doyle_repairs`.
- Show KPI cards for:
  - Total repair spend
  - Average repair cost
  - PM compliance
  - Active Doyle units
- Show highest-cost PTAC units by combining onsite and Doyle costs.
- Show active Doyle queue.
- Show recent PM logs.
- Add clickable PTAC references that open the shared unit detail screen.

Acceptance scenarios:

- A newly logged onsite repair appears in spending totals.
- A Doyle repair appears in spending totals.
- PM compliance changes when units move into or out of `Needs PM`.
- Highest-cost unit list sorts correctly.

### 5. Doyle Contractor Portal

The Doyle portal should remain isolated to contractor-relevant work.

Planned behavior:

- Show only PTAC units with `status == "Doyle Shop"`.
- Hide unnecessary internal hotel metrics.
- Let Doyle select one dispatched PTAC from a queue.
- Capture:
  - Technician signature
  - Invoice/work order reference
  - Labor cost
  - Parts cost
  - Replaced core components
  - Extra parts
  - Diagnostic notes
  - Return route
- Return route options:
  - Spare storage
  - Direct to guest room
- If returning to a guest room that already has an active PTAC, require an occupied-room override and move the existing active unit to Maintenance Office.
- On submit:
  - Insert into `doyle_repairs`
  - Insert into `custody_transfers`
  - Update `ptac_units`

Acceptance scenarios:

- Doyle can only see units currently assigned to Doyle Shop.
- Completed Doyle repair moves the unit out of Doyle Shop.
- Returning to storage sets location type to `Spare`.
- Returning to a room sets location type to `Room`.
- Occupied-room override is logged in transfer notes.

### 6. Deployment And QR Base URL

`app_base_url` belongs in `.streamlit/secrets.toml`, not in a Python file.

Example:

```toml
app_base_url = "https://your-deployed-app-url"
```

or:

```toml
[app]
base_url = "https://your-deployed-app-url"
```

After deployment, QR codes rely on this value so they encode URLs such as:

```text
https://your-deployed-app-url?unit_detail=PTAC-001
```

If the app is run locally, QR codes may point to `localhost` or the current host. A phone scanning a local `localhost` QR code will not reach the laptop unless the app is exposed through a reachable network URL.

Vercel may be possible, but Streamlit is usually simpler to host on Streamlit Community Cloud, Render, Railway, or another Python-friendly platform. The QR URL strategy is the same no matter where the app is hosted: the deployed app needs one stable public base URL.

## Testing Plan

### Navigation Tests

- Open a unit detail from the dashboard, then click `Directory List`; the directory page should show.
- Open a unit detail from the directory, then click `Avery Labels`; the labels page should show.
- Click `Back to Board`; the selected unit and query params should clear.
- Open a direct `?unit_detail=PTAC-###` URL; the correct unit detail page should show.

### QR Tests

- Unit detail QR code should encode a full URL, not plain text.
- Avery label QR code should encode a full URL, not plain text.
- Scanning a QR should open the correct unit detail/action screen.

### Supabase Write Tests

- Custody transfer writes to `custody_transfers` and updates `ptac_units`.
- PM log writes to `pm_logs` and updates `ptac_units.last_pm_date`.
- Onsite repair writes to `onsite_repairs`.
- If PM or onsite repair requires moving a unit to Maintenance Office first, that movement writes to `custody_transfers` and updates `ptac_units`.
- Doyle completion writes to `doyle_repairs`, writes to `custody_transfers`, and updates `ptac_units`.

### UI Tests

- Action dialogs open as modals.
- Transfer forms show only relevant follow-up dropdowns.
- Technician fields are not prefilled with `Hotel Maintenance`.
- Required technician validation appears before writes.
- Occupied-room override warning appears when needed.

## Current File Inventory

### `app.py` - mostly complete

Main Streamlit entry point, Supabase connection initializer, and custom navigation shell. It now includes unit-detail clearing on category/page changes. Remaining work is mainly browser verification and possible cleanup of unused imports such as `pandas`.

### `current.md` - handoff document

This file. It should be kept updated whenever major workflow or architecture changes are made.

### `requirements.txt` - dependency list

Contains Python dependencies needed to run the Streamlit app.

### `views/__init__.py` - package marker

Marks `views` as an importable Python package.

### `views/_shared.py` - shared helper/data layer

Shared Supabase reads, status helpers, room/location options, QR URL helpers, and core write helpers.

### `views/dashboard.py` - mostly complete

Hotel operations dashboard with KPI cards, floor grid, support sections, and unit links into the hidden detail screen. Unit links now explicitly use same-tab behavior.

### `views/directory.py` - mostly complete

Inventory directory with search/filter/table UI and spare registration. `View / Action` sets `selected_ptac_id` and should open the shared unit detail screen.

### `views/unit_detail.py` - mostly complete

Hidden detail/action screen for individual units. Contains QR display, current location details, action dialogs, and history feed.

### `views/scanner.py` - first-pass placeholder

Manual lookup and simple scanner action prototype. Should become a route into shared unit detail instead of duplicating action logic.

### `views/avery.py` - first-pass placeholder

Printable Avery-style label preview. Needs QR payload update to use full unit detail URLs and more polished selection controls.

### `views/analytics.py` - first-pass placeholder

Basic spending and PM audit page. Needs more management-ready reporting and links into unit detail.

### `views/doyle.py` - first-pass placeholder

Basic Doyle contractor portal. Needs UI polish, occupied-room override logic, and stronger isolation of contractor workflows.

## Planned Files

No new major Streamlit view files are currently required. The planned screens already exist under `views/`.

Optional future files may be useful if the code grows:

- `views/_styles.py` if CSS becomes too duplicated across pages.
- `views/_actions.py` if custody transfer, PM, repair, and Doyle workflows become too large for `unit_detail.py` and `doyle.py`.
- Deployment config files depending on the final hosting platform.

## Recommended Build Order From Here

1. Browser-test navigation/detail clearing and same-tab dashboard unit clicks.
2. Update `views/avery.py` QR payloads to use `unit_detail_url(ptac_id)`.
3. Simplify `views/scanner.py` into a scanner/lookup gateway to unit detail.
4. Polish `views/analytics.py`.
5. Polish `views/doyle.py`.
6. Configure deployment and `app_base_url`.

The safest approach is to finish one workflow at a time and keep all unit-level actions flowing through the shared unit detail screen wherever possible.
