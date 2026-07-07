"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const isContractor = pathname.startsWith("/doyle");
  const pages = isContractor ? CONTRACTOR_PAGES : HOTEL_PAGES;

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
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="rounded-[10px] bg-blue-600 p-2 font-bold text-white">🏨</div>
          <div>
            <h1 className="text-lg font-black leading-none text-slate-900">PTAC Pro Tracker</h1>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Console Management System
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <Link href="/dashboard" className={categoryClasses(!isContractor)}>
            🏨 Hotel Operations View
          </Link>
          <Link href="/doyle" className={categoryClasses(isContractor)}>
            🛠️ Contractor Portals
          </Link>
        </div>
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto pb-3">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className={pageClasses(pathname.startsWith(page.href))}>
            {page.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
