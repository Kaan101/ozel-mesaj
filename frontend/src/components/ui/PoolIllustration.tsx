// Kullanici istegi: Havuz ekraninin, ana sayfayla ayni gorsel temaya
// (bahar/sicak baglanti hissi) sahip olmasi icin - "sorularin havuzda
// yuzdugu, birinin onlari kesfettigi" fikrini temsil eden bir
// illustrasyon. ConnectionIllustration ile ayni renk paleti/stil.
export function PoolIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Sorular bir havuzda yuzuyor, biri onlari kesfediyor"
    >
      {/* Havuz (su) */}
      <ellipse cx="240" cy="190" rx="220" ry="46" fill="#B8DBF7" />
      <ellipse cx="240" cy="188" rx="220" ry="40" fill="#DCEEFB" />

      {/* Guneş */}
      <circle cx="410" cy="40" r="26" fill="#FFD166" />

      {/* Yuzen soru balonlari */}
      <g className="animate-gentle-float" style={{ transformOrigin: "120px 150px" }}>
        <circle cx="120" cy="150" r="22" fill="#45B78C" />
        <text x="120" y="158" textAnchor="middle" fontSize="24" fill="white" fontWeight="bold">
          ?
        </text>
      </g>
      <g
        className="animate-gentle-float"
        style={{ transformOrigin: "210px 175px", animationDelay: "0.8s" }}
      >
        <circle cx="210" cy="175" r="17" fill="#3E8EDE" />
        <text x="210" y="182" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">
          ?
        </text>
      </g>
      <g
        className="animate-gentle-float"
        style={{ transformOrigin: "330px 160px", animationDelay: "1.5s" }}
      >
        <circle cx="330" cy="160" r="20" fill="#F4685A" />
        <text x="330" y="168" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold">
          ?
        </text>
      </g>

      {/* Kesfeden kisi (buyutec ile bakiyor) */}
      <g>
        <circle cx="240" cy="90" r="26" fill="#FFE0C2" />
        <path d="M214 90a26 26 0 0 1 52 0v5h-52v-5z" fill="#22303F" />
        <path d="M205 175c2-42 18-70 35-70s33 28 35 70z" fill="#3E8EDE" />
        <path d="M205 175h70l-5 16h-60z" fill="#2F76BE" />
      </g>

      {/* Buyutec */}
      <g transform="translate(295 110) rotate(20)">
        <circle cx="0" cy="0" r="16" stroke="#22303F" strokeWidth="4" fill="#F2FBF8" fillOpacity="0.6" />
        <line x1="11" y1="11" x2="24" y2="24" stroke="#22303F" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
