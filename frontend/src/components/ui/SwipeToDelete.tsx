"use client";

import { useRef, useState, ReactNode } from "react";

const OPEN_X = -84; // px - kaydirildiginda acilan "Sil" alaninin genisligi
const DRAG_THRESHOLD = 8; // px - bunun altindaki hareketler "tiklama" sayilir, swipe degil

// Kullanici istegi: mobil tarayicidan acildiginda, satiri sola
// kaydirinca altindan kirmizi bir "Sil" butonu cikan, iOS Mail/WhatsApp
// benzeri bir davranis. Masaustunde (dokunma yoksa) mevcut kucuk cop
// kutusu ikonu ayni sekilde calismaya devam eder - bu ikisi birbirini
// disari birakmaz, sadece dokunmatik cihazlarda ek bir kolaylik saglar.
export function SwipeToDelete({
  onDelete,
  deleteLabel = "Sil",
  children,
}: {
  onDelete: () => void;
  deleteLabel?: string;
  children: ReactNode;
}) {
  const [baseX, setBaseX] = useState(0); // 0 (kapali) ya da OPEN_X (acik)
  const [dragX, setDragX] = useState(0); // suruklerken canli fark
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const draggedFarRef = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    draggedFarRef.current = false;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const delta = e.touches[0].clientX - startXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD) draggedFarRef.current = true;
    setDragX(delta);
  }

  function handleTouchEnd() {
    setIsDragging(false);
    const total = baseX + dragX;
    // Yolun yarisindan fazla kaydirildiysa acik kalsin, degilse kapansin.
    setBaseX(total < OPEN_X / 2 ? OPEN_X : 0);
    setDragX(0);
    startXRef.current = null;
  }

  // Kullanici istegi (gezinme cakismasi onlemi): parmagini gercekten
  // kaydirdiysa (DRAG_THRESHOLD'dan fazla), o dokunustan dogan
  // tiklama/navigasyonu engelle - kazara mesaja girmesin.
  function handleClickCapture(e: React.MouseEvent) {
    if (draggedFarRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedFarRef.current = false;
    }
  }

  const translate = Math.min(0, Math.max(OPEN_X, baseX + dragX));

  return (
    <div className="relative overflow-hidden rounded-bubble">
      {/* Kaydirinca altindan cikan kirmizi Sil alani */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          type="button"
          onClick={() => {
            setBaseX(0);
            onDelete();
          }}
          className="flex h-full w-[84px] items-center justify-center bg-coral font-body text-sm font-semibold text-white"
          style={{ borderTopRightRadius: "1.5rem", borderBottomRightRadius: "1.5rem" }}
        >
          {deleteLabel}
        </button>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${translate}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
