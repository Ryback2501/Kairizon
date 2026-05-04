"use client";

import { useState } from "react";
import { Input } from "./ui/Input";

interface AddProductFormProps {
  onAdded: () => void;
  onError: (message: string | null) => void;
}

export function AddProductForm({ onAdded, onError }: AddProductFormProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        onError(data.error || "Something went wrong");
        return;
      }

      setUrl("");
      onAdded();
    } catch {
      onError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an Amazon product URL…"
          disabled={loading}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Add product"
        title="Add product"
      >
        {loading ? (
          <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>
    </form>
  );
}
