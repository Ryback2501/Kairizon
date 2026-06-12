"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import type { Theme } from "@/repositories/IAppSettingsRepository";

interface HeaderMenuProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SettingsIcon = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SunIcon = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const RefreshIcon = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const InfoIcon = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

interface MenuItemProps {
  icon: JSX.Element;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({ icon, label, onClick, disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-brand-ink hover:bg-brand-subtle/40 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <span className="shrink-0 text-brand-gray">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
    </button>
  );
}

export function HeaderMenu({
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenInfo,
  onRefresh,
  refreshing,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isDark = theme === "dark";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menu"
      >
        <svg {...ICON_PROPS} width={16} height={16} aria-hidden="true">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 py-1 rounded-md border border-black/8 dark:border-white/10 dark:border-white/10 bg-brand-canvas shadow-card z-20"
        >
          <MenuItem
            icon={<SettingsIcon />}
            label="Settings"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          />
          <MenuItem
            icon={isDark ? <SunIcon /> : <MoonIcon />}
            label={isDark ? "Light theme" : "Dark theme"}
            onClick={onToggleTheme}
          />
          <MenuItem
            icon={<RefreshIcon />}
            label={refreshing ? "Refreshing…" : "Refresh"}
            disabled={refreshing}
            onClick={() => {
              setOpen(false);
              onRefresh();
            }}
          />
          <MenuItem
            icon={<InfoIcon />}
            label="Information"
            onClick={() => {
              setOpen(false);
              onOpenInfo();
            }}
          />
        </div>
      )}
    </div>
  );
}
