"use client";

import { useEffect, useState } from "react";
import type { CronStatus } from "@/lib/cron-status";

interface StatusResponse {
  version: string;
  cron: CronStatus;
}

interface InfoModalProps {
  onClose: () => void;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  return `${diffHr} hours ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function InfoModal({ onClose }: InfoModalProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((r) => r.json() as Promise<StatusResponse>)
      .then(setStatus)
      .catch(() => null);
  }, []);

  const cron = status?.cron;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/8">
          <div>
            <h2 className="font-cal text-base font-semibold text-brand-charcoal">Kairizon</h2>
            {status && (
              <p className="text-xs text-brand-gray">v{status.version}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-brand-gray hover:text-brand-charcoal hover:bg-brand-subtle transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-brand-gray leading-relaxed">
            Kairizon monitors Amazon product prices and notifies you by email when
            prices drop to your target. Add a product URL, set a target price, and
            let it run — prices are checked automatically every 30 minutes.
          </p>

          <div className="border-t border-black/8 pt-4">
            <p className="text-xs font-semibold text-brand-charcoal mb-2">Price check status</p>

            {!cron ? (
              <p className="text-xs text-brand-gray">Loading…</p>
            ) : cron.lastRunAt === null ? (
              <p className="text-xs text-brand-gray">No price check has run yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-gray">Last run</span>
                  <span className="text-xs text-brand-charcoal font-medium">
                    {formatRelativeTime(cron.lastRunAt)}
                  </span>
                </div>
                {cron.lastRunDurationMs !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray">Duration</span>
                    <span className="text-xs text-brand-charcoal font-medium">
                      {formatDuration(cron.lastRunDurationMs)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-gray">Result</span>
                  {cron.currentlyRunning ? (
                    <span className="text-xs text-amber-600 font-medium">Running…</span>
                  ) : cron.lastRunSuccess ? (
                    <span className="text-xs text-green-600 font-medium">Success</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Failed</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
