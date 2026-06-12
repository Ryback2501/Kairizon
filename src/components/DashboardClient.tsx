"use client";

import { useState, useEffect } from "react";
import { Header } from "./Header";
import { ProductList } from "./ProductList";
import { SettingsModal } from "./SettingsModal";
import { InfoModal } from "./InfoModal";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";
import { isSettingsConfigured } from "@/repositories/IAppSettingsRepository";

const EMPTY_SETTINGS: AppSettingsData = {
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  theme: "light",
};

export function DashboardClient() {
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [settingsConfigured, setSettingsConfigured] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<AppSettingsData>(EMPTY_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/settings", { signal: controller.signal })
      .then((r) => r.json() as Promise<AppSettingsData>)
      .then((data) => {
        setCurrentSettings(data);
        const configured = isSettingsConfigured(data);
        setSettingsConfigured(configured);
        if (!configured) setShowSettings(true);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[DashboardClient] Failed to load settings:", err);
        }
      });
    return () => controller.abort();
  }, []);

  // Apply the active theme to the document root so the `dark` variant engages.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", currentSettings.theme === "dark");
  }, [currentSettings.theme]);

  function handleSettingsSaved(settings: AppSettingsData) {
    setCurrentSettings(settings);
    const configured = isSettingsConfigured(settings);
    setSettingsConfigured(configured);
    if (configured) setShowSettings(false);
  }

  function handleToggleTheme() {
    const nextTheme: AppSettingsData["theme"] = currentSettings.theme === "dark" ? "light" : "dark";
    setCurrentSettings((s) => ({ ...s, theme: nextTheme }));
    void fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme }),
    }).catch((err: unknown) => {
      console.error("[DashboardClient] Failed to persist theme:", err);
    });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenInfo={() => setShowInfo(true)}
        onAdded={() => setRefreshKey((k) => k + 1)}
        onRefreshed={() => setRefreshKey((k) => k + 1)}
        theme={currentSettings.theme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="flex-1 overflow-y-auto bg-brand-subtle py-10">
        <div className="max-w-2xl mx-auto px-4">
          <ProductList refreshKey={refreshKey} />
        </div>
      </main>
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showSettings && (
        <SettingsModal
          initialSettings={currentSettings}
          onClose={settingsConfigured ? () => setShowSettings(false) : null}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  );
}
