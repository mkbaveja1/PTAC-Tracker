"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_LABELS } from "@/lib/auth/roles";

const HOTEL_PAGES = [
  { label: "📊 Dashboard Grid", href: "/dashboard" },
  { label: "📋 Directory List", href: "/directory" },
  { label: "📸 Smart QR Scanner", href: "/scanner" },
  { label: "🖨️ Avery Labels", href: "/labels" },
  { label: "💰 Spending Audits", href: "/analytics" },
];

const CONTRACTOR_PAGES = [{ label: "🔧 Doyle Tech Portal", href: "/doyle" }];

export function AppHeader() {
  const pathname = usePathname();
  const { role, signOut } = useAuth();

  // Contractors are locked to the Doyle portal — no hotel nav, no category
  // toggle. Hotel staff see everything; which sub-nav shows follows the path.
  const isContractor = role === "doyle";
  const onContractorSection = pathname.startsWith("/doyle");
  const pages = isContractor ? [] : onContractorSection ? CONTRACTOR_PAGES : HOTEL_PAGES;

  const categoryClasses = (active: boolean) =>
    `rounded-lg px-4 py-1.5 text-xs font-extrabold transition-colors ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
    }`;

  const pageClasses = (active: boolean) =>
    `whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
      active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="border-b border-slate-200 bg-white px-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={isContractor ? "/doyle" : "/dashboard"} className="flex items-center gap-3">
          <div className="rounded-[10px] bg-blue-600 p-2 font-bold text-white">🏨</div>
          <div>
            <h1 className="text-lg font-black leading-none text-slate-900">PTAC Pro Tracker</h1>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Console Management System
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {!isContractor && (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <Link href="/dashboard" className={categoryClasses(!onContractorSection)}>
                🏨 Hotel Operations View
              </Link>
              <Link href="/doyle" className={categoryClasses(onContractorSection)}>
                🛠️ Contractor Portals
              </Link>
            </div>
          )}

          {role && (
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                {ROLE_LABELS[role]}
              </span>
              <button
                onClick={signOut}
                className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {pages.length > 0 && (
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-3">
          {pages.map((page) => (
            <Link key={page.href} href={page.href} className={pageClasses(pathname.startsWith(page.href))}>
              {page.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
