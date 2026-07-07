# PTAC Pro Tracker

Hotel operations console for tracking PTAC (Packaged Terminal Air Conditioner) units across guest rooms, hallways, maintenance office, Doyle offsite repair, and spare storage. Built with **Streamlit**, **Python**, and **Supabase**.

---

## Installation

### Prerequisites

- Python 3.11 or later
- A Supabase project with the required tables (see [ARCHITECTURE.md](./ARCHITECTURE.md))
- Supabase URL and anon/service key

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd PTAC

# Create and activate a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
```

---

## Environment Variables

Streamlit uses **secrets**, not `.env` files. Copy the example and fill in your values:

```bash
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
```

Edit `.streamlit/secrets.toml`:

```toml
[supabase]
url = "https://YOUR-PROJECT-ID.supabase.co"
key = "YOUR_SUPABASE_ANON_OR_SERVICE_KEY"

[app]
# Required for QR codes when running locally or behind a proxy.
# On Streamlit Cloud, app_base_url() prefers the live host header.
base_url = "https://YOUR-APP-NAME.streamlit.app"
```

**Never commit `.streamlit/secrets.toml`** — it contains credentials.

For **Streamlit Community Cloud**, paste the same TOML block into:  
Manage app → Settings → Secrets

---

## Running Locally

```bash
streamlit run app.py
```

The app opens at `http://localhost:8501` by default.

### First-time Supabase setup

If writes fail with RLS policy errors, run the SQL in:

```
supabase/rls_policies.sql
```

in Supabase → SQL Editor.

---

## Build Process

This is a interpreted Python app — there is no compile/build step.

```bash
# Verify dependencies install cleanly
pip install -r requirements.txt

# Run the app
streamlit run app.py
```

For production, the hosting platform installs from `requirements.txt` automatically.

---

## Deployment

### Streamlit Community Cloud (recommended)

1. Push the repo to GitHub
2. Connect at [share.streamlit.io](https://share.streamlit.io)
3. Set main file: `app.py`
4. Add secrets (supabase + app base_url)
5. Deploy and note the public URL (e.g. `https://hampton-ptac-tracker.streamlit.app`)
6. Update `[app].base_url` in secrets to match the deployed URL
7. Reprint Avery labels so QR codes point to the live URL

### Other platforms

Compatible with any Python host that supports Streamlit:

- **Render** — Web service, start command: `streamlit run app.py --server.port=$PORT --server.address=0.0.0.0`
- **Railway** — Same start command pattern
- **Docker** — Use `python:3.11-slim`, install requirements, expose port 8501

After deployment, configure `app.base_url` so QR codes encode the public URL.

---

## Testing

No automated test suite exists yet. Manual test plan:

### Navigation
- [ ] Open unit detail from dashboard → switch to Directory → directory shows (not detail)
- [ ] Open unit detail from directory → switch to Avery Labels → labels show
- [ ] Click "Back to Board" → returns to dashboard, clears selection
- [ ] Open `?unit_detail=PTAC-001` directly → correct unit shows

### QR
- [ ] Unit detail QR encodes full URL (not plain PTAC ID text)
- [ ] Avery label QR encodes full URL
- [ ] Scanning deployed QR opens correct unit detail

### Supabase Writes
- [ ] Custody transfer → `custody_transfers` + `ptac_units` updated
- [ ] PM log → `pm_logs` + `last_pm_date` updated
- [ ] Onsite repair → `onsite_repairs` row created
- [ ] Doyle completion → `doyle_repairs` + transfer + unit updated

### UI
- [ ] Action dialogs open as modals
- [ ] Transfer shows only relevant follow-up dropdowns
- [ ] Technician fields not prefilled
- [ ] Occupied-room override warning appears when needed

---

## Linting

No linter configuration is included in the repo. Recommended setup:

```bash
pip install ruff
ruff check .
ruff format .
```

---

## Project Structure

```
PTAC/
├── app.py                      # Entry point, navigation, Supabase init
├── requirements.txt            # Python dependencies
├── .streamlit/
│   ├── config.toml             # Streamlit theme
│   └── secrets.toml.example    # Secrets template
├── supabase/
│   └── rls_policies.sql        # Database RLS policies
└── views/
    ├── _shared.py              # Shared data layer & domain helpers
    ├── dashboard.py            # Floor grid dashboard
    ├── directory.py            # Inventory table
    ├── unit_detail.py          # Unit action screen (shared)
    ├── scanner.py              # QR / manual lookup
    ├── avery.py                # Label printer
    ├── analytics.py            # Spending & PM audits
    └── doyle.py                # Contractor portal
```

---

## Documentation

| File | Description |
|------|-------------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Purpose, features, personas, roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, schema, routing, stack |
| [COMPONENTS.md](./COMPONENTS.md) | Page modules and UI building blocks |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Colors, typography, spacing, patterns |
| [DATA_FLOW.md](./DATA_FLOW.md) | Reads, writes, validation, errors |
| [TODO.md](./TODO.md) | Completed/remaining work, bugs, debt |
| [CLAUDE_CONTEXT.md](./CLAUDE_CONTEXT.md) | AI handoff context and conventions |
| [CHANGELOG.md](./CHANGELOG.md) | Major implementation history |
| [PROJECT_STATE.md](./PROJECT_STATE.md) | Current stop point and next task |
| [DIRECTORY_TREE.txt](./DIRECTORY_TREE.txt) | Full project tree |

---

## Quick Start Checklist

1. `pip install -r requirements.txt`
2. Copy and fill `.streamlit/secrets.toml`
3. Run RLS SQL in Supabase if needed
4. `streamlit run app.py`
5. Open Dashboard → click a room tile → verify unit detail loads
