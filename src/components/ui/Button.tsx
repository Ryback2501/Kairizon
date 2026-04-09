"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
  };

  const variants = {
    primary:
      "bg-brand-charcoal text-white shadow-button-inset hover:opacity-80",
    secondary:
      "bg-brand-subtle text-brand-charcoal border border-black/10 hover:opacity-80",
    ghost: "text-brand-gray hover:text-brand-charcoal",
    danger: "bg-red-600 text-white shadow-button-inset hover:opacity-80",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="animate-spin mr-2 h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
      ) : null}
      {children}
    </button>
  );
}
