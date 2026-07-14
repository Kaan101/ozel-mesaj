export interface AvatarSpec {
  ageGender: "genc-erkek" | "genc-kiz" | "yetiskin-kadin" | "yetiskin-erkek" | string | null;
  hairLength: "kisa" | "uzun" | string | null;
  hasGlasses: boolean | null;
}

// Her ageGender degeri icin: cilt tonu ve vucut/aksan rengi.
const APPEARANCE: Record<string, { skin: string; accent: string }> = {
  "genc-erkek": { skin: "#FFE0C2", accent: "#3E8EDE" },
  "genc-kiz": { skin: "#FFE0C2", accent: "#F4685A" },
  "yetiskin-kadin": { skin: "#F3C89A", accent: "#45B78C" },
  "yetiskin-erkek": { skin: "#F3C89A", accent: "#FFD166" },
};

// Kullanici istegi: girişte secilen basit cizgisel avatar - gercek
// kimlik tasimaz, sadece gorsel bir tercih. Tek bir parametrik SVG
// bileseni, ageGender + hairLength + hasGlasses kombinasyonlarina gore
// farkli gorunumler uretir (16 kombinasyon icin ayri ayri statik SVG
// cizmek yerine).
export function Avatar({
  spec,
  size = 64,
}: {
  spec: AvatarSpec;
  size?: number;
}) {
  const appearance = APPEARANCE[spec.ageGender ?? "genc-erkek"] ?? APPEARANCE["genc-erkek"];
  const isLongHair = spec.hairLength === "uzun";
  const isFemalePresenting = spec.ageGender === "genc-kiz" || spec.ageGender === "yetiskin-kadin";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Kullanici avatari"
    >
      <circle cx="50" cy="50" r="48" fill={`${appearance.accent}20`} />

      {/* Govde */}
      <path d="M20 92c3-20 12-30 30-30s27 10 30 30z" fill={appearance.accent} />

      {/* Uzun sac (govdeden once, omuzlarda gorunsun diye govdeden once cizilir) */}
      {isLongHair && (
        <path
          d="M22 78c-2-18 2-34 10-42l36 0c8 8 12 24 10 42-4-6-8-10-8-20a20 20 0 0 0-40 0c0 10-4 14-8 20z"
          fill="#3A2E2A"
        />
      )}

      {/* Kafa */}
      <circle cx="50" cy="42" r="20" fill={appearance.skin} />

      {/* Kisa sac / ust sac (her iki durumda da ustte biraz sac var) */}
      <path
        d={
          isFemalePresenting
            ? "M30 38a20 20 0 0 1 40 0c0-14-9-24-20-24s-20 10-20 24z"
            : "M31 36a19 19 0 0 1 38 0c1-12-8-22-19-22s-20 10-19 22z"
        }
        fill="#3A2E2A"
      />

      {/* Gozler */}
      <circle cx="42" cy="44" r="2.2" fill="#22303F" />
      <circle cx="58" cy="44" r="2.2" fill="#22303F" />

      {/* Gulumseme */}
      <path
        d="M42 52c3 3 13 3 16 0"
        stroke="#22303F"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gozluk (opsiyonel) */}
      {spec.hasGlasses && (
        <g stroke="#22303F" strokeWidth="1.8" fill="none">
          <circle cx="42" cy="44" r="6" />
          <circle cx="58" cy="44" r="6" />
          <path d="M48 44h4" />
        </g>
      )}
    </svg>
  );
}
