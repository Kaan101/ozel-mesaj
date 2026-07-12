import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Gorev 9.3: Temel input komponenti. OTP kodu gibi alanlarda
// `mono` font ile kullanilmasi onerilir (className="font-mono").
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-semibold text-slate">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate
            placeholder:text-slate-light/60
            focus:outline-none focus:ring-4 focus:ring-sky/20 focus:border-sky
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-coral ring-2 ring-coral/20" : ""} ${className}`}
          {...props}
        />
        {error && <p className="font-body text-xs text-coral">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
