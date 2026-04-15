"use client";

import { useState, useEffect } from "react";
import { Header } from "./Header";
import { ProductList } from "./ProductList";
import { SettingsModal } from "./SettingsModal";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";
import { isSettingsConfigured } from "@/repositories/IAppSettingsRepository";

const EMPTY_SETTINGS: AppSettingsData = {
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
};

export function DashboardClient() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsConfigured, setSettingsConfigured] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<AppSettingsData>(EMPTY_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json() as Promise<AppSettingsData>)
      .then((data) => {
        setCurrentSettings(data);
        const configured = isSettingsConfigured(data);
        setSettingsConfigured(configured);
        if (!configured) setShowSettings(true);
      });
  }, []);

  function handleSettingsSaved(settings: AppSettingsData) {
    setCurrentSettings(settings);
    const configured = isSettingsConfigured(settings);
    setSettingsConfigured(configured);
    if (configured) setShowSettings(false);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onAdded={() => setRefreshKey((k) => k + 1)}
      />
      <main className="flex-1 overflow-y-auto bg-brand-subtle py-10">
        <div className="max-w-2xl mx-auto px-4">
          <ProductList refreshKey={refreshKey} />
        </div>
      </main>
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
