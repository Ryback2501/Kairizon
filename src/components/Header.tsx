"use client";

import { useState } from "react";
import { AddProductForm } from "./AddProductForm";

interface HeaderProps {
  onOpenSettings: () => void;
  onAdded: () => void;
  onRefreshed: () => void;
}

export function Header({ onOpenSettings, onAdded, onRefreshed }: HeaderProps) {
  const [updating, setUpdating] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function handleRefreshAll() {
    setRefreshError(null);
    setUpdating(true);
    try {
      const res = await fetch("/api/products/refresh", { method: "POST" });
      if (res.ok) {
        onRefreshed();
      } else {
        const data = await res.json() as { error?: string };
        setRefreshError(data.error ?? "Refresh failed");
      }
    } catch {
      setRefreshError("Network error — could not refresh");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <header className="shrink-0 border-b border-black/8 bg-white">
      {refreshError && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-600 text-center">
          {refreshError}
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
        <span className="font-cal text-lg font-semibold text-brand-charcoal tracking-tight shrink-0">
          Kairizon
        </span>

        <div className="h-5 w-px bg-black/10 shrink-0" />

        <div className="flex-1 min-w-0">
          <AddProductForm onAdded={onAdded} />
        </div>

        <div className="h-5 w-px bg-black/10 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={updating}
            onClick={handleRefreshAll}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh all products"
            title="Refresh all products"
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
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity"
            aria-label="Open settings"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
