"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";

// Kullanici istegi: public/images/face/ klasorune konulan sabit bir
// resim setinden secim yapip DOGRUDAN (metin yazmadan) mesaj olarak
// gonderebilme. Resimler 1cm x 1cm boyutunda kucuk bir panoda gorunur.
// (Kullanici istegi: pool/type sekmeleri KALDIRILDI - tek liste,
// ilk (tek) haline geri donuldu.)
export function FaceImagePicker({
  onSelect,
  disabled = false,
}: {
  onSelect: (imageKey: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Kullanici istegi: ekranin alt kismindaysa, popup asagiya tasip
  // gorunmez olmasin diye YUKARI dogru acilsin.
  const [openUpward, setOpenUpward] = useState(false);
  // Kullanici istegi (mobil duzeltmesi): popup, ekranin SAG kenarini
  // asip sayfanin yatay genislemesine (responsive bozulmasina) neden
  // olmasin diye, gerekirse SAGA hizali (right-0) acilir.
  const [alignRight, setAlignRight] = useState(false);
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

  // Kullanici istegi: butonun kendisinde, face dizinindeki ILK resim
  // kucuk bir ikon olarak gorunsun - bu yuzden liste popup ACILMADAN
  // (component yuklenir yuklenmez) erkenden cekilir.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/face-images");
        const data: { images: string[] } = await res.json();
        if (!cancelled) setImages(data.images);
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
      const estimatedPopupHeight = 180;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < estimatedPopupHeight);

      // Kullanici istegi: popup genisligi (max 288px), butonun SOL
      // kenarindan basladiginda ekranin SAGINA tasiyor mu kontrol
      // edilir - tasiyorsa SAGA hizali acilir.
      const estimatedPopupWidth = 288;
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < estimatedPopupWidth);
    }
    setIsOpen((v) => !v);
  }

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
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/images/face/${images[0]}`}
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
          className={`absolute z-10 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-2 border-sky-light bg-white p-3 shadow-soft-lifted ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } ${alignRight ? "right-0" : "left-0"}`}
        >
          {isLoading ? (
            <p className="font-body text-sm text-slate-light">{t("common.loading")}</p>
          ) : images.length === 0 ? (
            <p className="font-body text-sm text-slate-light">{t("faceImages.empty")}</p>
          ) : (
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {images.map((imageKey) => (
                <button
                  key={imageKey}
                  type="button"
                  onClick={() => {
                    onSelect(imageKey);
                    setIsOpen(false);
                  }}
                  title={imageKey}
                  className="overflow-hidden rounded-lg border-2 border-transparent hover:border-sky transition-colors"
                  style={{ width: "1cm", height: "1cm" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/face/${imageKey}`}
                    alt={imageKey}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
