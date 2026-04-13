"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  // Three distinct visual states:
  //   disabled  → bg-black/10 (light, transparent — matches old unchecked look)
  //   unchecked → bg-gray-300 (visible mid-gray, clearly interactive but off)
  //   checked   → bg-brand-charcoal (dark)
  const trackColor = disabled
    ? "bg-black/10 cursor-not-allowed"
    : checked
    ? "bg-brand-charcoal"
    : "bg-gray-300";

  return (
    <label className={`flex items-center gap-2 select-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${trackColor}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      {label && (
        <span className="text-xs text-brand-gray leading-none">{label}</span>
      )}
    </label>
  );
}
