"use client";

import { Avatar, AvatarSpec } from "./Avatar";

const AGE_GENDER_OPTIONS: { value: NonNullable<AvatarSpec["ageGender"]>; label: string }[] = [
  { value: "genc-erkek", label: "Genç Erkek" },
  { value: "genc-kiz", label: "Genç Kız" },
  { value: "yetiskin-kadin", label: "Kadın" },
  { value: "yetiskin-erkek", label: "Erkek" },
];

// Kullanici istegi: girisin bir parcasi olarak avatar secimi. Kullanici
// yas/cinsiyet, sac uzunlugu ve gozluk tercihini secip anlik onizleme
// gorur.
export function AvatarPicker({
  spec,
  onChange,
}: {
  spec: AvatarSpec;
  onChange: (spec: AvatarSpec) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Avatar spec={spec} size={96} />
      </div>

      <div>
        <p className="font-display text-sm font-semibold text-slate mb-2">Görünüm</p>
        <div className="grid grid-cols-2 gap-2">
          {AGE_GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...spec, ageGender: opt.value })}
              className={`rounded-2xl border-2 px-3 py-2 font-body text-sm transition-colors ${
                spec.ageGender === opt.value
                  ? "border-sky bg-sky-light text-sky"
                  : "border-sky-light bg-white text-slate hover:border-sky"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-display text-sm font-semibold text-slate mb-2">Saç Uzunluğu</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...spec, hairLength: "kisa" })}
            className={`rounded-2xl border-2 px-3 py-2 font-body text-sm transition-colors ${
              spec.hairLength === "kisa"
                ? "border-sky bg-sky-light text-sky"
                : "border-sky-light bg-white text-slate hover:border-sky"
            }`}
          >
            Kısa
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...spec, hairLength: "uzun" })}
            className={`rounded-2xl border-2 px-3 py-2 font-body text-sm transition-colors ${
              spec.hairLength === "uzun"
                ? "border-sky bg-sky-light text-sky"
                : "border-sky-light bg-white text-slate hover:border-sky"
            }`}
          >
            Uzun
          </button>
        </div>
      </div>

      <div>
        <p className="font-display text-sm font-semibold text-slate mb-2">Gözlük</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...spec, hasGlasses: false })}
            className={`rounded-2xl border-2 px-3 py-2 font-body text-sm transition-colors ${
              spec.hasGlasses === false
                ? "border-sky bg-sky-light text-sky"
                : "border-sky-light bg-white text-slate hover:border-sky"
            }`}
          >
            Yok
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...spec, hasGlasses: true })}
            className={`rounded-2xl border-2 px-3 py-2 font-body text-sm transition-colors ${
              spec.hasGlasses === true
                ? "border-sky bg-sky-light text-sky"
                : "border-sky-light bg-white text-slate hover:border-sky"
            }`}
          >
            Var
          </button>
        </div>
      </div>
    </div>
  );
}
