import type { Metadata } from "next";
import HavuzDetayClient from "./HavuzDetayClient";

interface PoolEntryDetail {
  title: string;
  questionText: string;
  category: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function fetchEntry(id: string): Promise<PoolEntryDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/pool/entries/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Gorev 12.5: Sosyal medyada paylasildiginda guzel bir onizleme karti
// cikmasi icin dinamik OG etiketleri (Bolum 11, "Sosyal paylasim").
// Bu, generateMetadata'nin server component gerektirmesi yuzunden ayri
// bir dosyaya (HavuzDetayClient) tasinan client mantigini sarmalayan
// bir server component.
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const entry = await fetchEntry(params.id);

  if (!entry) {
    return { title: "Soru bulunamadı — YouHaveMi" };
  }

  const description = `"${entry.questionText}" — Bu soruyu cevaplayabilir misin? Doğru bilirsen anında bağlantı kurarsın.`;

  return {
    title: `${entry.title} — YouHaveMi`,
    description,
    openGraph: {
      title: entry.title,
      description,
      type: "website",
      images: [`/havuz/${params.id}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description,
    },
  };
}

export default function HavuzDetayPage({ params }: { params: { id: string } }) {
  return <HavuzDetayClient entryId={params.id} />;
}
