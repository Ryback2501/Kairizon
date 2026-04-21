"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";
import { isSettingsConfigured } from "@/repositories/IAppSettingsRepository";

interface SettingsModalProps {
  initialSettings: AppSettingsData;
  onClose: (() => void) | null;
  onSaved: (settings: AppSettingsData) => void;
}

export function SettingsModal({ initialSettings, onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof AppSettingsData, value: string | number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (settings.smtpPort < 1 || settings.smtpPort > 65535) {
      setError("SMTP port must be between 1 and 65535");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        setError("Failed to save settings");
        return;
      }
      const saved = await res.json() as AppSettingsData;
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  const canClose = onClose !== null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/8">
          <h2 className="font-cal text-base font-semibold text-brand-charcoal">Settings</h2>
          {canClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-brand-gray hover:text-brand-charcoal hover:bg-brand-subtle transition-colors"
              aria-label="Close settings"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">
          {!canClose && (
            <p className="text-xs text-brand-gray bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Fill in all required fields to start using Kairizon.
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-charcoal">SMTP Host <span className="text-red-500">*</span></label>
            <Input
              value={settings.smtpHost}
              onChange={(e) => set("smtpHost", e.target.value)}
              placeholder="smtp.gmail.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-charcoal">SMTP Port</label>
            <Input
              type="number"
              value={settings.smtpPort.toString()}
              onChange={(e) => set("smtpPort", parseInt(e.target.value) || 587)}
              placeholder="587"
              min={1}
              max={65535}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-charcoal">SMTP User (email) <span className="text-red-500">*</span></label>
            <Input
              type="email"
              value={settings.smtpUser}
              onChange={(e) => set("smtpUser", e.target.value)}
              placeholder="you@gmail.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-charcoal">SMTP Password <span className="text-red-500">*</span></label>
            <Input
              type="password"
              value={settings.smtpPass}
              onChange={(e) => set("smtpPass", e.target.value)}
              placeholder="App password"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-charcoal">From address <span className="text-red-500">*</span></label>
            <Input
              value={settings.smtpFrom}
              onChange={(e) => set("smtpFrom", e.target.value)}
              placeholder="Kairizon <you@gmail.com>"
              required
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving || !isSettingsConfigured(settings)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save settings"
              title="Save settings"
            >
              {saving ? (
                <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
