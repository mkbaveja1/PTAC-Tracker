"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./auth-provider";

// The "door" everyone passes through. Hotel staff enter the hotel code (full
// access); Doyle contractors enter the Doyle code (portal only).
export function CodeEntryScreen() {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const role = signIn(code);
    if (!role) {
      toast.error("That access code wasn't recognized. Check with your manager.");
      setCode("");
    }
    // On success the provider updates role and AuthGate swaps in the app.
  };

  return (
    <div className="flex min-h-[85vh] flex-1 items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-[10px] bg-blue-600 p-2 text-xl font-bold text-white">🏨</div>
          <div>
            <h1 className="text-lg font-black leading-none text-slate-900">PTAC Pro Tracker</h1>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Console Management System
            </span>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-black text-slate-900">Enter your access code</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Hotel staff and Doyle contractors each have their own code.
        </p>

        <Input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Access code"
          autoFocus
          autoComplete="off"
          className="mt-4"
        />

        <Button type="submit" className="mt-4 w-full" disabled={!code.trim()}>
          Continue
        </Button>
      </form>
    </div>
  );
}
