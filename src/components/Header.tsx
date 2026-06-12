"use client";

import { useState } from "react";
import { AddProductForm } from "./AddProductForm";
import { HeaderMenu } from "./HeaderMenu";
import type { Theme } from "@/repositories/IAppSettingsRepository";

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onAdded: () => void;
  onRefreshed: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ onOpenSettings, onOpenInfo, onAdded, onRefreshed, theme, onToggleTheme }: HeaderProps) {
  const [updating, setUpdating] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

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
    <header className="shrink-0 border-b border-black/8 dark:border-white/10 bg-brand-canvas">
      {(addError || refreshError) && (
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50 px-4 py-2 text-xs text-red-600 dark:text-red-400 text-center">
          {addError ?? refreshError}
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
        <span className="font-cal text-lg font-semibold text-brand-ink tracking-tight shrink-0">
          Kairizon
        </span>

        <div className="h-5 w-px bg-black/10 dark:bg-white/15 shrink-0" />

        <div className="flex-1 min-w-0">
          <AddProductForm onAdded={onAdded} onError={setAddError} />
        </div>

        <div className="h-5 w-px bg-black/10 dark:bg-white/15 shrink-0" />

        <HeaderMenu
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenSettings={onOpenSettings}
          onOpenInfo={onOpenInfo}
          onRefresh={handleRefreshAll}
          refreshing={updating}
        />
      </div>
    </header>
  );
}
