import { createClient } from "@supabase/supabase-js";

// Module-level singleton — one client per browser session,
// same role as st.session_state.supabase in the Streamlit app.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
