"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

interface AddProductFormProps {
  onAdded: () => void;
}

export function AddProductForm({ onAdded }: AddProductFormProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setUrl("");
      onAdded();
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
          error={error ?? undefined}
          disabled={loading}
          required
        />
      </div>
      <Button type="submit" loading={loading} disabled={!url.trim()}>
        Add
      </Button>
    </form>
  );
}
