# PTAC Pro Tracker — Project Overview

## Purpose

**PTAC Pro Tracker** is a live hotel operations console for managing every Packaged Terminal Air Conditioner (PTAC) unit at a Hampton Inn property. It replaces manual spreadsheets and ad-hoc tracking with a Supabase-backed database and a Streamlit web interface.

The application answers operational questions in real time:

- Where is every PTAC unit right now?
- What condition is each unit in?
- When was it last serviced?
- Which units need preventative maintenance (PM)?
- Which units are at the offsite contractor (Doyle)?
- Which spare units are available in storage?

**Supabase** is the single source of truth. **Streamlit** is the operations UI. All custody changes, PM logs, onsite repairs, and Doyle repairs are written to Supabase — not kept only in browser or temporary session state.

---

## Main Features

| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard Grid | **Complete** | Visual floor-by-floor map of all PTAC units with color-coded status tiles and KPI cards |
| Directory List | **Complete** | Searchable/filterable inventory table with spare registration |
| Unit Detail Screen | **Complete** | Hidden action screen for custody transfer, PM, onsite repair, edit specs, delete |
| Smart QR Scanner | **Partial** | Manual lookup routes to unit detail; camera scanning not yet implemented |
| Avery Labels | **Partial** | Printable 2×5 label sheets with QR codes using full unit-detail URLs |
| Spending Audits | **Partial** | Repair spend, PM compliance, Doyle queue; needs polish and richer reporting |
| Doyle Tech Portal | **Partial** | Contractor workflow for completing offsite repairs and returning units |

---

## User Personas

### Hotel Maintenance Technician
- Uses the **Dashboard** to see unit status across floors
- Opens **Unit Detail** from room tiles or the **Directory**
- Executes **custody transfers** (room → Maintenance Office → Doyle, etc.)
- Logs **PM checklists** and **onsite repairs**
- Uses **QR Scanner** and printed **Avery labels** in the field

### Hotel Operations Manager
- Monitors KPI cards on the **Dashboard** (PM overdue, units at Doyle, etc.)
- Uses **Directory** for full inventory search and spare registration
- Reviews **Spending Audits** for repair costs and PM compliance
- Prints **Avery labels** for new or relocated units

### Doyle Contract Technician
- Uses the **Doyle Tech Portal** (Contractor Portals mode)
- Sees only units currently at Doyle Shop
- Completes repair records with invoice, parts, and return route
- Returns units to spare storage or directly to guest rooms

---

## Current Implementation Status

### Production-ready workflows
- App shell with custom horizontal navigation (`app.py`)
- Supabase connection and session initialization
- Shared data/helper layer (`views/_shared.py`)
- Dashboard floor grid with status colors and same-tab unit links
- Directory with search, filters, and spare registration
- Unit detail with modal dialogs for all major actions
- Navigation clearing when switching tabs (fixes stuck unit-detail state)
- QR deep links via `?unit_detail=PTAC-###`
- Occupied-room override logic for custody transfers
- Doyle repair completion with displacement handling (`complete_doyle_repair`)

### First-pass / needs polish
- Scanner (lookup gateway exists; no camera; duplicate action logic removed)
- Avery labels (QR URLs correct; selection UX mostly done; print flow works)
- Analytics / Spending Audits (functional KPIs; needs management-ready polish)
- Doyle portal (functional submit path; UI and isolation can improve)

### Not started / external
- Production deployment with stable `app_base_url`
- React/Next.js frontend on Vercel (planned Streamlit replacement)
- Automated test suite
- User authentication / role-based access

### Completed (data)
- `seed.py` — initial Hampton Inn PTAC inventory bootstrapped in Supabase

---

## Known Limitations

1. **No authentication** — Anyone with the app URL and Supabase anon key can read/write. RLS policies are permissive (`allow_all_*`).
2. **No caching** — Every page load fetches live data from Supabase (intentional; avoids stale inventory).
3. **Localhost QR codes** — QR links point to `localhost` when running locally; phones cannot scan them unless `app.base_url` is set or the app runs on a public host.
4. **Streamlit reruns** — All interactivity triggers full script reruns; complex forms require widgets outside `st.form` for immediate dependent dropdowns.
5. **No camera QR scanning** — Scanner accepts typed IDs and pasted URLs only.
6. **Single hotel** — Room layout (Floors 2–6, specific suffixes, suites) is hardcoded for this Hampton Inn property.
7. **pandas listed but minimally used** — Only in `analytics.py` for grouping repair costs.

---

## Future Roadmap

### Near term (recommended build order)
1. Browser-verify navigation/detail clearing and same-tab dashboard links
2. Finalize Avery label print workflow and multi-sheet pagination
3. Simplify scanner as pure lookup gateway (remove any remaining duplicate logic)
4. Polish Spending Audits with richer summaries and unit-detail links
5. Polish Doyle portal UI and contractor isolation
6. Deploy to Streamlit Community Cloud (or similar) and configure `app.base_url` — **or skip and migrate directly to Vercel**

### Medium term — React / Vercel migration (preferred direction)
The project owner intends to move off Streamlit. **Vercel does not host Streamlit** (it needs a persistent Python server), so the practical path is a **Next.js (React) frontend** deployed on Vercel, keeping **Supabase** as the backend.

Target stack:
- **Next.js** (App Router) + **TypeScript** — pages, routing, SSR/SSG where useful
- **Vercel** — hosting, preview deploys, environment variables
- **Supabase JS client** (`@supabase/supabase-js`) — same tables, same RLS
- **Tailwind CSS** + **shadcn/ui** — match existing ops-console styling
- **TanStack Query** — live Supabase reads (replaces uncached Streamlit reruns)
- **react-hook-form** + **Zod** — custody transfer, PM, repair, Doyle forms
- **html5-qrcode** or **@zxing/browser** — native camera QR scanning (major upgrade over Streamlit)

Migration approach: port `views/_shared.py` business logic to TypeScript utilities/hooks, then rebuild each Streamlit view as a React route. Streamlit app remains reference implementation until feature parity.

### Medium term (Streamlit polish — optional if migrating soon)
- Camera-based QR scanning
- Role-based views (hotel staff vs. Doyle contractor)
- PM due-date automation (status → `Needs PM` based on schedule)
- Email/SMS alerts for PM overdue units

### Long term
- Multi-property support
- Mobile-optimized layout (natural fit for React/Vercel)
- Audit log export for accounting
- Integration with hotel PMS or work-order systems
