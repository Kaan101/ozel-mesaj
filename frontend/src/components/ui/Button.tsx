import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sky text-white hover:bg-sky-hover focus-visible:ring-sky/40",
  secondary: "bg-meadow text-white hover:bg-meadow-hover focus-visible:ring-meadow/40",
  ghost: "bg-transparent text-slate hover:bg-sky-light focus-visible:ring-sky/30",
};

// Gorev 9.3: Temel buton komponenti. Bahar/sosyal tema - yuvarlak
// koseler, canli mavi/yesil renkler.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-display text-sm font-semibold
          transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-mint
          ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
