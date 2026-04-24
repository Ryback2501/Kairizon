"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-brand-charcoal">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray shadow-input focus:outline-hidden focus:ring-2 focus:ring-brand-charcoal/20 disabled:opacity-50 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
