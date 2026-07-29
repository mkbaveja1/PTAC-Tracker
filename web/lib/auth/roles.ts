// Lightweight, client-side access roles. This is a SOFT gate — the codes are
// checked in the browser, so it keeps ordinary users on the right screen but is
// not a hard security boundary (a technical user could bypass it). Real
// enforcement requires Supabase Auth + RLS (Implementation.md Phase 9).

export type Role = "hotel" | "doyle";

export const ROLE_STORAGE_KEY = "ptac_role";

// Codes come from env so they aren't committed to source. Defaults let the app
// work out of the box; change them in web/.env.local (and Vercel env vars).
const HOTEL_CODE = process.env.NEXT_PUBLIC_HOTEL_ACCESS_CODE ?? "hampton2026";
const DOYLE_CODE = process.env.NEXT_PUBLIC_DOYLE_ACCESS_CODE ?? "doyle2026";

// Returns the role a code unlocks, or null if the code isn't recognized.
export function roleForCode(code: string): Role | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed === HOTEL_CODE) return "hotel";
  if (trimmed === DOYLE_CODE) return "doyle";
  return null;
}

export function isValidRole(value: unknown): value is Role {
  return value === "hotel" || value === "doyle";
}

export const ROLE_LABELS: Record<Role, string> = {
  hotel: "Hotel Staff",
  doyle: "Doyle Contractor",
};
