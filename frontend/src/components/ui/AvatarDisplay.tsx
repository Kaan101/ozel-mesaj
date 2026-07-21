"use client";

import { useMemo } from "react";
import { Avatar, AvatarId } from "./Avatar";
import { AvatarConfig, generateAvatarSvg, DEFAULT_AVATAR_CONFIG } from "@/lib/dicebear-avatar";

// Kullanici istegi: yeni ozellestirilebilir (DiceBear) avatar sistemi
// eskisiyle (10 sabit ikon) birlikte calisir. avatarConfig doluysa
// ONCELIKLIDIR - degilse eski avatarId sistemine (Avatar bileseni)
// duser. Boylece daha once eski sistemle avatar secmis kullanicilar
// da sorunsuz calismaya devam eder.
export function AvatarDisplay({
  avatarId,
  avatarConfig,
  size = 64,
}: {
  avatarId?: AvatarId | string | null;
  avatarConfig?: Partial<AvatarConfig> | null;
  size?: number;
}) {
  const svg = useMemo(() => {
    if (!avatarConfig) return null;
    try {
      return generateAvatarSvg({ ...DEFAULT_AVATAR_CONFIG, ...avatarConfig });
    } catch {
      return null;
    }
  }, [avatarConfig]);

  if (svg) {
    return (
      <div
        style={{ width: size, height: size }}
        className="shrink-0 overflow-hidden rounded-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return <Avatar avatarId={avatarId} size={size} />;
}
