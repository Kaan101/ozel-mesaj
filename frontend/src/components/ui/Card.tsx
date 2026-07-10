import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  lifted?: boolean;
}

// Gorev 9.3: Temel kart komponenti - ferah, yumusak golgeli, bahar
// temasina uygun genis yuvarlak koseler.
export function Card({ lifted = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-bubble bg-white p-6 ${lifted ? "shadow-soft-lifted" : "shadow-soft"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
