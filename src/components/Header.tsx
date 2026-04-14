"use client";

import { useState } from "react";

export function Header() {
  const [updating, setUpdating] = useState(false);

  async function handleRefreshAll() {
    setUpdating(true);
    await fetch("/api/products/refresh", { method: "POST" });
    setUpdating(false);
  }

  return (
    <header className="border-b border-black/8 bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-cal text-lg font-semibold text-brand-charcoal tracking-tight">
          Kairizon
        </span>
        <button
          disabled={updating}
          onClick={handleRefreshAll}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh all products"
        >
          {updating ? (
            <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
