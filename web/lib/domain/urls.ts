// Replaces app_base_url() / unit_detail_url() / parse_scan_lookup() from _shared.py.

export function appBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function unitDetailUrl(ptacId: string): string {
  return `${appBaseUrl()}/units/${encodeURIComponent(ptacId)}`;
}

// Accepts a plain PTAC ID, a new /units/ URL, or a legacy Streamlit
// ?unit_detail= URL (printed labels from the old app must keep working).
export function parseScanLookup(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = text.includes("://") ? new URL(text) : new URL(text, "http://local");

    const unitsMatch = url.pathname.match(/\/units\/([^/]+)/);
    if (unitsMatch) return decodeURIComponent(unitsMatch[1]).trim().toUpperCase();

    const id = url.searchParams.get("unit_detail");
    if (id) return id.trim().toUpperCase();
  } catch {
    // Not a URL — treat as a raw PTAC ID below
  }

  return text.toUpperCase();
}
