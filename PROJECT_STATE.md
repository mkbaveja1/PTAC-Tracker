# Project State — PTAC Pro Tracker

**Last updated:** July 6, 2026  
**For:** Claude Code / any AI assistant continuing development

---

## Where Development Stopped

Development is **past the core MVP** but **before production deployment**.

### Complete and stable
| Area | File(s) | Confidence |
|------|---------|------------|
| App shell & navigation | `app.py` | High — includes nav clearing fix |
| Shared data layer | `views/_shared.py` | High |
| Dashboard floor grid | `views/dashboard.py` | High |
| Directory inventory table | `views/directory.py` | High — owner-polished styling |
| Unit detail & all actions | `views/unit_detail.py` | High — modals, validation, history |
| QR deep links | `app.py`, `_shared.py` | High — code complete |
| RLS policies | `supabase/rls_policies.sql` | High — script ready |
| Initial inventory seed | `seed.py` | High — Hampton Inn PTAC inventory bootstrapped in Supabase |

### Functional but needs polish
| Area | File(s) | Gap |
|------|---------|-----|
| Scanner | `views/scanner.py` | No camera; gateway works |
| Avery labels | `views/avery.py` | Print margins unverified on physical sheets |
| Spending audits | `views/analytics.py` | Basic KPIs; needs management polish |
| Doyle portal | `views/doyle.py` | Works; UI isolation and edge cases |

### Not done
- Production deployment
- `app.base_url` configured for live QR scanning from phones
- Browser verification of navigation fix
- React/Next.js frontend migration (planned replacement for Streamlit; target host: Vercel)
- Automated tests
- Authentication

---

## Last Significant Changes

1. Navigation clearing fix — `clear_unit_detail_selection()` in `app.py`
2. Scanner simplified to lookup gateway (no duplicate forms)
3. Avery QR payloads use full `unit_detail_url()`
4. Analytics and Doyle pages wired to unit detail via clickable links
5. `complete_doyle_repair()` with occupied-room displacement in `_shared.py`

---

## Recommended Next Task

### Task: Deploy and verify QR workflow end-to-end

**Why this is next:** All core features are code-complete. QR codes are the primary field workflow (scan label → open unit detail → take action). Until the app is deployed with a public URL, phone scanning cannot be tested and the operational loop is incomplete.

**Steps:**

1. **Deploy to Streamlit Community Cloud**
   - Connect GitHub repo
   - Main file: `app.py`
   - Add secrets:
     ```toml
     [supabase]
     url = "..."
     key = "..."
     [app]
     base_url = "https://YOUR-APP.streamlit.app"
     ```

2. **Run RLS SQL** in Supabase if writes fail

3. **Browser-test navigation** (manual checklist in README.md):
   - Unit detail clears when switching tabs
   - Dashboard links stay in same tab
   - `?unit_detail=PTAC-001` deep link works

4. **Print one Avery label** from deployed app

5. **Scan printed QR with phone** → confirm unit detail opens on deployed URL

6. **If localhost warning appears on unit detail**, update `[app].base_url` in secrets and redeploy

**Acceptance criteria:**
- Phone scan of printed label opens correct unit detail on public URL
- Tab navigation no longer traps user on unit detail
- Custody transfer write succeeds against production Supabase

---

## After Deployment — Recommended Sequence

| Order | Task | File(s) |
|-------|------|---------|
| 1 | Link dashboard scanner pill to Smart QR Scanner page | `views/dashboard.py` |
| 2 | Polish Doyle portal UI isolation | `views/doyle.py` |
| 3 | Enrich analytics reporting | `views/analytics.py` |
| 4 | Add camera QR scanning | `views/scanner.py` |
| 5 | Consolidate PM/repair writes to use `_shared` helpers | `unit_detail.py`, `_shared.py` |
| 6 | Begin React/Next.js frontend on Vercel (see migration notes in `PROJECT_OVERVIEW.md`) | new `web/` app |

---

## Environment Prerequisites

Before any development session:

```bash
pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# Fill in Supabase credentials
streamlit run app.py
```

Supabase must have populated `ptac_units` data. Initial inventory was bootstrapped via completed `seed.py`.

---

## Critical Context Files

Read in this order:

1. **`CLAUDE_CONTEXT.md`** — conventions, do-not-change list, pitfalls
2. **`ARCHITECTURE.md`** — system design and schema
3. **`views/_shared.py`** — all data operations
4. **`views/unit_detail.py`** — core action workflows
5. **`TODO.md`** — full backlog

---

## Single-Sentence Summary

> PTAC Pro Tracker is a working Streamlit hotel ops console with a complete dashboard/directory/unit-detail core; deploy it next, verify QR scanning from phones, then polish scanner, analytics, and Doyle portal.
