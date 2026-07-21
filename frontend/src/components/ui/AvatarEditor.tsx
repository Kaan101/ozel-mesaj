"use client";

import { useMemo } from "react";
import {
  AvatarConfig,
  generateAvatarSvg,
  randomAvatarConfig,
  HAIR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  SKIN_COLOR_OPTIONS,
  EYES_OPTIONS,
  EYEBROWS_OPTIONS,
  MOUTH_OPTIONS,
  GLASSES_OPTIONS,
  EARRINGS_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/dicebear-avatar";

const FEATURE_LABELS: Record<string, string> = {
  none: "Yok",
  mustache: "Bıyık",
  blush: "Allık",
  birthmark: "Ben",
  freckles: "Çil",
};

// Kullanici istegi: kullanicinin yuklendigi ornege benzer sekilde,
// zengin ozellestirilebilir bir avatar uretebilecek duzenleme ekrani.
// Her secim degistiginde canli onizleme gunceller - tamamen
// tarayicida (DiceBear ile) calisir, harici servise istek atmaz.
export function AvatarEditor({
  config,
  onChange,
}: {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
}) {
  const previewSvg = useMemo(() => generateAvatarSvg(config), [config]);

  function update<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-soft-lifted"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
        />
        <button
          type="button"
          onClick={() => onChange(randomAvatarConfig())}
          className="rounded-full border-2 border-sky-light bg-white px-4 py-1.5 font-body text-sm text-sky hover:bg-sky-light/30"
        >
          🎲 Rastgele
        </button>
      </div>

      <OptionRow label="Saç Stili">
        {HAIR_OPTIONS.map((hair) => (
          <Swatch
            key={hair}
            active={config.hair === hair}
            onClick={() => update("hair", hair)}
            svg={generateAvatarSvg({ ...config, hair })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Saç Rengi">
        {HAIR_COLOR_OPTIONS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            active={config.hairColor === color}
            onClick={() => update("hairColor", color)}
          />
        ))}
      </OptionRow>

      <OptionRow label="Ten Rengi">
        {SKIN_COLOR_OPTIONS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            active={config.skinColor === color}
            onClick={() => update("skinColor", color)}
          />
        ))}
      </OptionRow>

      <OptionRow label="Gözler">
        {EYES_OPTIONS.map((eyes) => (
          <Swatch
            key={eyes}
            active={config.eyes === eyes}
            onClick={() => update("eyes", eyes)}
            svg={generateAvatarSvg({ ...config, eyes })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Kaşlar">
        {EYEBROWS_OPTIONS.map((eyebrows) => (
          <Swatch
            key={eyebrows}
            active={config.eyebrows === eyebrows}
            onClick={() => update("eyebrows", eyebrows)}
            svg={generateAvatarSvg({ ...config, eyebrows })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Ağız">
        {MOUTH_OPTIONS.map((mouth) => (
          <Swatch
            key={mouth}
            active={config.mouth === mouth}
            onClick={() => update("mouth", mouth)}
            svg={generateAvatarSvg({ ...config, mouth })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Gözlük">
        <Swatch
          active={config.glasses === null}
          onClick={() => update("glasses", null)}
          label="Yok"
        />
        {GLASSES_OPTIONS.map((glasses) => (
          <Swatch
            key={glasses}
            active={config.glasses === glasses}
            onClick={() => update("glasses", glasses)}
            svg={generateAvatarSvg({ ...config, glasses })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Küpe">
        <Swatch
          active={config.earrings === null}
          onClick={() => update("earrings", null)}
          label="Yok"
        />
        {EARRINGS_OPTIONS.map((earrings) => (
          <Swatch
            key={earrings}
            active={config.earrings === earrings}
            onClick={() => update("earrings", earrings)}
            svg={generateAvatarSvg({ ...config, earrings })}
          />
        ))}
      </OptionRow>

      <OptionRow label="Ek Özellik">
        {FEATURE_OPTIONS.map((feature) => (
          <button
            key={feature}
            type="button"
            onClick={() => update("feature", feature)}
            className={`rounded-full border-2 px-3 py-1.5 font-body text-xs transition-colors ${
              config.feature === feature
                ? "border-meadow bg-meadow-light text-meadow-hover"
                : "border-slate-light/40 bg-white text-slate-light hover:bg-mint"
            }`}
          >
            {FEATURE_LABELS[feature]}
          </button>
        ))}
      </OptionRow>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-body text-sm font-semibold text-slate">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Swatch({
  active,
  onClick,
  svg,
  label,
}: {
  active: boolean;
  onClick: () => void;
  svg?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-colors ${
        active ? "border-meadow" : "border-slate-light/30 hover:border-slate-light"
      }`}
    >
      {svg ? (
        <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="font-body text-[10px] text-slate-light">{label}</span>
      )}
    </button>
  );
}

function ColorSwatch({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: `#${color}` }}
      className={`h-9 w-9 shrink-0 rounded-full border-2 transition-transform ${
        active ? "border-meadow scale-110" : "border-white/60 hover:scale-105"
      }`}
      aria-label={`Renk #${color}`}
    />
  );
}
