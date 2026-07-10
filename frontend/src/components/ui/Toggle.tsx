"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

// Gorev 9.3: Temel toggle komponenti. Acikken cayir yesili, kapaliyken
// notr gri - bahar/sosyal tema.
export function Toggle({ checked, onChange, label, id, disabled = false }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-meadow/30 focus-visible:ring-offset-2 focus-visible:ring-offset-mint
          ${checked ? "bg-meadow" : "bg-slate/20"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
      {label && <span className="font-body text-sm text-slate">{label}</span>}
    </label>
  );
}
