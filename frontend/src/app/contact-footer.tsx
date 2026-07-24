"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: iletisim e-postasi ve adresi, footer'da (ve KVKK
// Aydinlatma Metni'nde) gosterilir - ikisi de AYNI sistem
// parametresinden (yonetim panelinden deploy'a gerek kalmadan
// degistirilebilir) okur. Ayri bir "use client" bileseni - ReleaseFooter
// (build-zamanli, sunucu bileseni) ile karismasin diye.
export function ContactFooter() {
  const [contact, setContact] = useState<{ email: string; address: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/settings/public/contact-info`)
      .then((res) => res.json())
      .then(setContact)
      .catch(() => {});
  }, []);

  if (!contact) return null;

  return (
    <p className="text-center font-body text-[10px] text-slate-light/60">
      İletişim: {contact.email} · {contact.address}
    </p>
  );
}
