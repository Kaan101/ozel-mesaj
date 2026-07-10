// Gorev 9.3: Imza gorsel - iki kisi arasindaki sicak baglantiyi
// temsil eden, bahar unsurlariyla (yaprak, cicek, gunes) suslenmis
// duz çizgi illustrasyon. Sosyal/bahar temasinin gorsel imzasi.
export function ConnectionIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Iki kisi arasinda sicak bir baglanti kuruluyor"
    >
      {/* Zemin - cim */}
      <path d="M0 280c80-24 160-24 240 0s160 24 240 0v40H0v-40z" fill="#DCF3E9" />

      {/* Gunes */}
      <circle cx="410" cy="60" r="34" fill="#FFD166" />

      {/* Ucusan yapraklar */}
      <ellipse cx="70" cy="70" rx="12" ry="7" fill="#45B78C" transform="rotate(-20 70 70)" />
      <ellipse cx="120" cy="45" rx="10" ry="6" fill="#3E8EDE" transform="rotate(15 120 45)" />
      <ellipse cx="340" cy="140" rx="10" ry="6" fill="#45B78C" transform="rotate(30 340 140)" />

      {/* Kadin figuru (solda) */}
      <g>
        <circle cx="160" cy="150" r="28" fill="#FFE0C2" />
        <path d="M132 150a28 28 0 0 1 56 0v6h-56v-6z" fill="#3E8EDE" />
        <path
          d="M120 260c2-46 20-78 40-78s38 32 40 78z"
          fill="#3E8EDE"
        />
        <path d="M120 260h80l-6 20h-68z" fill="#2F76BE" />
      </g>

      {/* Erkek figuru (sagda) */}
      <g>
        <circle cx="320" cy="150" r="28" fill="#F3C89A" />
        <path d="M292 154a28 28 0 0 1 56 -8v8h-56z" fill="#22303F" />
        <rect x="288" y="182" width="64" height="60" rx="14" fill="#45B78C" />
        <rect x="288" y="242" width="64" height="18" fill="#379572" />
      </g>

      {/* Baglanti - konusma balonlari */}
      <path
        d="M200 150c20-14 40-14 60-4"
        stroke="#3E8EDE"
        strokeWidth="3"
        strokeDasharray="2 8"
        strokeLinecap="round"
        fill="none"
      />
      <g>
        <rect x="196" y="96" width="60" height="34" rx="14" fill="#FFFFFF" stroke="#3E8EDE" strokeWidth="2" />
        <path d="M214 128l-6 12 14-12z" fill="#FFFFFF" stroke="#3E8EDE" strokeWidth="2" />
        <circle cx="214" cy="113" r="3" fill="#3E8EDE" />
        <circle cx="226" cy="113" r="3" fill="#3E8EDE" />
        <circle cx="238" cy="113" r="3" fill="#3E8EDE" />
      </g>
    </svg>
  );
}
