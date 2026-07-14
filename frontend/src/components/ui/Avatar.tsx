export type AvatarId =
  | "genc-kiz"
  | "genc-erkek"
  | "erkek"
  | "kadin"
  | "cok-sacli-erkek"
  | "kivircik-kadin"
  | "kivircik-erkek"
  | "duz-sacli-kadin"
  | "olgun-erkek"
  | "olgun-kadin";

interface AvatarDef {
  label: string;
  skin: string;
  hair: string;
  accent: string;
  hasGlasses: boolean;
  hasMustache: boolean;
  hairPath: string;
}

// Kullanici istegi: 10 farkli, keskin cizgili ve karakterli avatar -
// her biri kendine ozgu bir sac stiliyle ayirt edilir (parametrik
// kombinasyon degil, tek tek tasarlanmis). Tum sekiller kalin siyah
// kontur (stroke) ile cizilir, "belirgin" bir cizgi-roman/ikon
// gorunumu icin.
export const AVATARS: Record<AvatarId, AvatarDef> = {
  "genc-kiz": {
    label: "Genç Kız",
    skin: "#FFE0C2",
    hair: "#8B4A2B",
    accent: "#F4685A",
    hasGlasses: false,
    hasMustache: false,
    // Iki topuz (pigtail) + on kaküL
    hairPath:
      "M31 34a19 19 0 0 1 38 0 c1-10-7-19-19-19s-20 9-19 19z M18 30a9 9 0 1 0 14 8c-2-6-7-10-14-8z M68 30a9 9 0 1 1 -14 8c2-6 7-10 14-8z",
  },
  "genc-erkek": {
    label: "Genç Erkek",
    skin: "#FFE0C2",
    hair: "#2E2420",
    accent: "#3E8EDE",
    hasGlasses: false,
    hasMustache: false,
    // Dikensi kisa sac (zigzag ust hat)
    hairPath:
      "M30 36c0-12 9-21 20-21s20 9 20 21c-2-3-4-7-4-7l-3 6-4-8-3 7-4-8-3 7-4-8-3 7-4-6c0 0-2 4-4 7z",
  },
  erkek: {
    label: "Erkek",
    skin: "#F3C89A",
    hair: "#2E2420",
    accent: "#2F76BE",
    hasGlasses: false,
    hasMustache: false,
    // Duz, temiz kisa sac
    hairPath: "M30 37a20 20 0 0 1 40 0c1-13-8-23-20-23s-21 10-20 23z",
  },
  kadin: {
    label: "Kadın",
    skin: "#FFE0C2",
    hair: "#5A3825",
    accent: "#45B78C",
    hasGlasses: false,
    hasMustache: false,
    // Bob kesim, cene hizasinda
    hairPath:
      "M28 52c-2-18 3-33 22-33s24 15 22 33c-3 2-5-6-5-14a17 17 0 0 0 -34 0c0 8-2 16-5 14z",
  },
  "cok-sacli-erkek": {
    label: "Çok Saçlı Erkek",
    skin: "#F3C89A",
    hair: "#1F1A17",
    accent: "#FFD166",
    hasGlasses: false,
    hasMustache: true,
    // Buyuk, hacimli sac (genis siluet)
    hairPath:
      "M20 40c-4-20 10-32 30-32s34 12 30 32c-3-2-4-10-8-14-2 6 0 10-3 12-2-8-4-13-9-15 0 7 1 11-2 13-3-9-5-13-9-14 0 7 0 11-3 13-3-8-5-12-9-13-1 6 0 10-3 12-3-7-6-11-10-12-1 6 1 10-4 18z",
  },
  "kivircik-kadin": {
    label: "Kıvırcık Saçlı Kadın",
    skin: "#F3C89A",
    hair: "#3A2E2A",
    accent: "#D9503F",
    hasGlasses: false,
    hasMustache: false,
    // Kivircik dalgali kontur (omuzlarin altina kadar)
    hairPath:
      "M24 74c-6-4-8-14-6-22-3-1-4-6-1-9-3-2-3-7 0-9-2-3-1-8 3-9-1-4 2-9 6-9-1-4 3-8 7-7 1-4 6-6 10-4 3-3 8-3 11 0 4-2 9 0 10 4 4-1 8 3 7 7 4-1 7 4 6 9 3 1 4 6 1 9 3 2 3 7 0 9 3 3 2 8-1 9 2 8 0 18-6 22-1-9-2-19-4-25a18 18 0 0 0 -33 0c-2 6-3 16-4 25z",
  },
  "kivircik-erkek": {
    label: "Kıvırcık Saçlı Erkek",
    skin: "#FFE0C2",
    hair: "#2E2420",
    accent: "#379572",
    hasGlasses: false,
    hasMustache: false,
    // Kisa-orta kivircik, kafaya yakin
    hairPath:
      "M28 38c-4-2-5-8-2-11-3-2-2-7 1-9-1-4 2-8 6-8-1-4 3-7 7-6 1-3 6-5 9-3 3-2 8-1 9 2 4-1 7 3 6 7 3 0 5 4 3 8 3 2 3 7 0 9-2-8-5-14-11-16a18 18 0 0 0 -28 3c-4 4-6 9-7 15z",
  },
  "duz-sacli-kadin": {
    label: "Düz Saçlı Kadın",
    skin: "#FFE0C2",
    hair: "#241D1B",
    accent: "#6BA8E8",
    hasGlasses: false,
    hasMustache: false,
    // Uzun duz sac, ortadan ayirik
    hairPath:
      "M26 80c-4-20-2-40 4-48a20 20 0 0 1 40 0c6 8 8 28 4 48-3-4-4-14-4-24a20 20 0 0 0 -40 0c0 10-1 20-4 24z M50 32v-13",
  },
  "olgun-erkek": {
    label: "Olgun Erkek",
    skin: "#F3C89A",
    hair: "#C7CDD3",
    accent: "#5B6B7D",
    hasGlasses: true,
    hasMustache: true,
    // Kisa, biraz seyrek (olgun) sac
    hairPath: "M32 33a18 18 0 0 1 36 0c0-11-8-19-18-19s-19 8-18 19z",
  },
  "olgun-kadin": {
    label: "Olgun Kadın",
    skin: "#FFE0C2",
    hair: "#B8BCC2",
    accent: "#E0B14D",
    hasGlasses: true,
    hasMustache: false,
    // Kisa, sik (olgun) sac
    hairPath: "M28 46c-2-16 4-29 22-29s24 13 22 29c-3 1-4-5-5-11a17 17 0 0 0 -34 0c-1 6-2 12-5 11z",
  },
};

export function Avatar({
  avatarId,
  size = 64,
}: {
  avatarId: AvatarId | string | null | undefined;
  size?: number;
}) {
  const def = AVATARS[(avatarId as AvatarId) ?? "genc-erkek"] ?? AVATARS["genc-erkek"];
  const outline = "#1F2937";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={def.label}
    >
      <circle cx="50" cy="50" r="48" fill={`${def.accent}1A`} />

      {/* Govde - kalin konturlu */}
      <path
        d="M18 92c3-22 13-32 32-32s29 10 32 32z"
        fill={def.accent}
        stroke={outline}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Kafa */}
      <circle cx="50" cy="42" r="20" fill={def.skin} stroke={outline} strokeWidth="2.5" />

      {/* Sac - her avatara ozel */}
      <path
        d={def.hairPath}
        fill={def.hair}
        stroke={outline}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Gozler */}
      <circle cx="42" cy="45" r="2.4" fill={outline} />
      <circle cx="58" cy="45" r="2.4" fill={outline} />

      {/* Gulumseme */}
      <path
        d="M41 53c3 4 15 4 18 0"
        stroke={outline}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bikik (opsiyonel) */}
      {def.hasMustache && (
        <path
          d="M40 50c3-2 7-2 10 0 3-2 7-2 10 0"
          stroke={outline}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Gozluk (opsiyonel) */}
      {def.hasGlasses && (
        <g stroke={outline} strokeWidth="2.2" fill="none">
          <circle cx="42" cy="45" r="6.5" />
          <circle cx="58" cy="45" r="6.5" />
          <path d="M48.5 45h3" />
        </g>
      )}
    </svg>
  );
}
