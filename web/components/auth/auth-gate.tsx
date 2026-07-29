"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";
import { CodeEntryScreen } from "./code-entry-screen";

// Decides what a visitor may see:
//   - no role  → the access-code screen (instead of the app)
//   - "doyle"  → locked to the Doyle portal; any hotel route bounces to /doyle
//   - "hotel"  → full access
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const doyleOnHotelRoute = role === "doyle" && !pathname.startsWith("/doyle");

  useEffect(() => {
    if (doyleOnHotelRoute) router.replace("/doyle");
  }, [doyleOnHotelRoute, router]);

  if (role === null) return <CodeEntryScreen />;
  if (doyleOnHotelRoute) return null; // redirecting to /doyle

  return <>{children}</>;
}
