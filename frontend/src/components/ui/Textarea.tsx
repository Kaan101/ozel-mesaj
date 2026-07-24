"use client";

import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

// Kullanici istegi: mesaj yazma kutusu 2 satirla baslasin, yazdikca
// otomatik buyusun (asagi kaydirma cubugu gerekmeden). "rows={2}"
// varsayilan yukseklik, JS ile icerige gore yukseklik ayarlanir.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = "", value, onChange, ...props }, forwardedRef) => {
    const inputId = id ?? props.name;
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    function resize(el: HTMLTextAreaElement | null) {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }

    useEffect(() => {
      resize(innerRef.current);
    }, [value]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-semibold text-slate">
            {label}
          </label>
        )}
        <textarea
          ref={(el) => {
            innerRef.current = el;
            if (typeof forwardedRef === "function") forwardedRef(el);
            else if (forwardedRef) forwardedRef.current = el;
          }}
          id={inputId}
          rows={2}
          value={value}
          onChange={(e) => {
            resize(e.target);
            onChange?.(e);
          }}
          className={`resize-none overflow-hidden rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate
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

Textarea.displayName = "Textarea";
