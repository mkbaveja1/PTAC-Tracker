"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5QrcodeScanner } from "html5-qrcode";

// html5-qrcode touches the DOM at import time, so it must be loaded
// client-side only via dynamic import inside useEffect.
export function QrCamera({ onScan }: { onScan: (decodedText: string) => void }) {
  const [enabled, setEnabled] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText) => onScanRef.current(decodedText),
        () => {
          // per-frame decode misses are expected; ignore
        }
      );
    });

    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm font-black text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
      >
        📸 Tap to start camera scanning
        <span className="mt-2 block text-xs font-semibold text-slate-400">
          Requires camera permission. Works on phones over HTTPS.
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div id="qr-reader" />
    </div>
  );
}
