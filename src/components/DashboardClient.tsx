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
    <>
      <Header onOpenSettings={() => setShowSettings(true)} />
      <main className="min-h-screen bg-brand-canvas px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <ProductList />
        </div>
      </main>
      {showSettings && (
        <SettingsModal
          initialSettings={currentSettings}
          onClose={settingsConfigured ? () => setShowSettings(false) : null}
          onSaved={handleSettingsSaved}
        />
      )}
    </>
  );
}
