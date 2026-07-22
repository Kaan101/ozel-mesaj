import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  // Kullanici istegi: input'un kendi kosesine (etiketin degil) kucuk
  // bir icerik (orn. avatar+nickname rozeti) yerlestirebilme.
  cornerContent?: ReactNode;
}

// Gorev 9.3: Temel input komponenti. OTP kodu gibi alanlarda
// `mono` font ile kullanilmasi onerilir (className="font-mono").
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", cornerContent, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-semibold text-slate">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate
              placeholder:text-slate-light/60
              focus:outline-none focus:ring-4 focus:ring-sky/20 focus:border-sky
              disabled:opacity-50 disabled:cursor-not-allowed
              ${cornerContent ? "pr-28" : ""}
              ${error ? "border-coral ring-2 ring-coral/20" : ""} ${className}`}
            {...props}
          />
          {cornerContent && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{cornerContent}</div>
          )}
        </div>
        {error && <p className="font-body text-xs text-coral">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
