"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";

// Kullanici istegi: public/images/face|pool|type/ klasorlerine
// konulan sabit resim setlerinden secim yapip DOGRUDAN (metin
// yazmadan) mesaj olarak gonderebilme. Resimler 1cm x 1cm boyutunda
// kucuk bir panoda, 3 SEKME (Face/Pool/Type) halinde gorunur.
const CATEGORIES = ["face", "pool", "type"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  face: "Face",
  pool: "Pool",
  type: "Type",
};

export function FaceImagePicker({
  onSelect,
  disabled = false,
}: {
  onSelect: (imageKey: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [imagesByCategory, setImagesByCategory] = useState<Record<Category, string[]>>({
    face: [],
    pool: [],
    type: [],
  });
  const [activeTab, setActiveTab] = useState<Category>("face");
  const [isLoading, setIsLoading] = useState(false);
  // Kullanici istegi: ekranin alt kismindaysa, popup asagiya tasip
  // gorunmez olmasin diye YUKARI dogru acilsin.
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Kullanici istegi: popup acikken, uygulamanin BASKA BIR YERINE
  // tiklaninca (butonun/popup'in DISINDA) otomatik kapansin.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Kullanici istegi: butonun kendisinde, "face" kategorisindeki ILK
  // resim kucuk bir ikon olarak gorunsun - bu yuzden TUM kategoriler
  // erkenden (component yuklenir yuklenmez) tek seferde cekilir.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/face-images?all=1");
        const data: { face: string[]; pool: string[]; type: string[] } = await res.json();
        if (!cancelled) {
          setImagesByCategory({ face: data.face, pool: data.pool, type: data.type });
        }
      } catch {
        // Sessizce gec.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleToggle() {
    // Kullanici istegi: popup, ekranin alt kismindaysa (asagida
    // yeterli yer yoksa) YUKARI dogru acilir.
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimatedPopupHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < estimatedPopupHeight);
    }
    setIsOpen((v) => !v);
  }

  const faceIcon = imagesByCategory.face[0];
  const activeImages = imagesByCategory[activeTab];

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center gap-1.5 font-body text-xs text-sky hover:text-sky/80 disabled:opacity-50"
      >
        {/* Kullanici istegi: sabit emoji yerine, face dizinindeki ILK
            resim kucuk bir ikon olarak gosterilir. */}
        {faceIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/images/face/${faceIcon}`}
            alt=""
            className="h-4 w-4 shrink-0 rounded object-cover"
          />
        ) : (
          <span aria-hidden="true">🖼️</span>
        )}
        {t("faceImages.button")}
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-10 w-72 overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Kullanici istegi: 3 sekme - Face / Pool / Type. */}
          <div className="flex border-b border-sky-light/50">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`flex-1 px-2 py-2 font-body text-xs font-semibold transition-colors ${
                  activeTab === cat
                    ? "border-b-2 border-sky text-sky"
                    : "text-slate-light hover:text-slate"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="p-3">
            {isLoading ? (
              <p className="font-body text-sm text-slate-light">{t("common.loading")}</p>
            ) : activeImages.length === 0 ? (
              <p className="font-body text-sm text-slate-light">{t("faceImages.empty")}</p>
            ) : (
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {activeImages.map((imageKey) => (
                  <button
                    key={imageKey}
                    type="button"
                    onClick={() => {
                      // Kullanici istegi: hangi kategoriden secildigi
                      // de saklanir (orn. "pool/happy.png") - mesaj
                      // goruntulenirken dogru klasorden okunabilsin.
                      onSelect(`${activeTab}/${imageKey}`);
                      setIsOpen(false);
                    }}
                    title={imageKey}
                    className="overflow-hidden rounded-lg border-2 border-transparent hover:border-sky transition-colors"
                    style={{ width: "1cm", height: "1cm" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/images/${activeTab}/${imageKey}`}
                      alt={imageKey}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
