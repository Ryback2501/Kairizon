"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

export function Header() {
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    await fetch("/api/test-notifications", { method: "POST" });
    setTesting(false);
  }

  return (
    <header className="border-b border-black/8 bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-cal text-lg font-semibold text-brand-charcoal tracking-tight">
          Kairizon
        </span>
        <Button size="sm" variant="secondary" loading={testing} onClick={handleTest}>
          Test
        </Button>
      </div>
    </header>
  );
}
