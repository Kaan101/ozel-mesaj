"use client";

import { Avatar, AVATARS, AvatarId } from "./Avatar";

// Kullanici istegi: 10 hazir avatardan biri secilir - izgara (grid)
// gorunumunde, secili olan belirgin sekilde vurgulanir.
export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId | null;
  onChange: (id: AvatarId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(Object.keys(AVATARS) as AvatarId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-colors ${
            value === id ? "border-sky bg-sky-light" : "border-sky-light bg-white hover:border-sky"
          }`}
        >
          <Avatar avatarId={id} size={56} />
          <span className="font-body text-[11px] text-slate text-center leading-tight">
            {AVATARS[id].label}
          </span>
        </button>
      ))}
    </div>
  );
}
