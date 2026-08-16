"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface LogEntry {
  id: string;
  eventType: string;
  userId: string | null;
  threadId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  country: string | null;
  city: string | null;
  screenResolution: string | null;
  timezone: string | null;
  metadata: any;
  createdAt: string;
}

interface ArchivedMessage {
  id: string;
  originalMessageId: string;
  senderUserId: string | null;
  senderPhone: string | null;
  isAnonymous: boolean;
  body: string;
  createdAt: string;
}

// Kullanici istegi: "hangi telefon hangi telefona ne zaman mesaj
// atti" sorusuna TEK ekranda cevap veren liste kaydi.
interface ThreadWithPhones {
  threadId: string;
  createdAt: string;
  originType: string;
  initiatorUserId: string;
  initiatorPhone: string | null;
  initiatorDisplayName: string | null;
  recipientUserId: string | null;
  recipientPhone: string | null;
  recipientDisplayName: string | null;
  messageCount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: hukuki ispat/belgeleme icin genel islem gunlugunu
// gorebilecegi, bir kullanicinin gercek telefon numarasini
// (sifresi cozulmus) acabilecegi ve bir thread'in arsivlenmis (silinmis
// olsa bile) mesajlarini gorebilecegi ekran. Ayni ADMIN_SECRET
// korumasini kullanir.
export default function AdminGunluklerPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [filterEventType, setFilterEventType] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterThreadId, setFilterThreadId] = useState("");

  const [revealedPhones, setRevealedPhones] = useState<Record<string, string | null>>({});
  const [revealedThreadMessages, setRevealedThreadMessages] = useState<
    Record<string, ArchivedMessage[]>
  >({});

  // Kullanici istegi: "hangi telefon hangi telefona ne zaman mesaj
  // atti" - tum konusmalari telefon numaralariyla listeleyen bolum.
  const [threadsWithPhones, setThreadsWithPhones] = useState<ThreadWithPhones[]>([]);
  const [threadsTotal, setThreadsTotal] = useState(0);
  const [threadsPage, setThreadsPage] = useState(1);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  // Kullanici istegi: belirli bir telefon numarasinin (format
  // farkina bakilmaksizin) attigi/aldigi TUM mesajlari arayabilme.
  const [phoneSearch, setPhoneSearch] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, page]);

  useEffect(() => {
    if (isUnlocked) fetchThreadsWithPhones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, threadsPage]);

  // Kullanici istegi: "hangi telefon hangi telefona ne zaman mesaj
  // atti" listesini cekme. "overridePhoneSearch" parametresi,
  // state guncellemesinin ASENKRON olmasi nedeniyle (orn. "Temizle"
  // butonunda) YANLIS/ESKI degeri kullanma riskini onler.
  async function fetchThreadsWithPhones(overridePhoneSearch?: string) {
    setIsThreadsLoading(true);
    try {
      const effectiveSearch = overridePhoneSearch ?? phoneSearch;
      const params = new URLSearchParams({ page: String(threadsPage), pageSize: "20" });
      if (effectiveSearch.trim()) params.set("phoneSearch", effectiveSearch.trim());
      const res = await fetch(`${API_BASE_URL}/admin/audit/threads?${params}`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setThreadsWithPhones(data.items);
        setThreadsTotal(data.total);
      }
    } catch {
      // Sessizce gec.
    } finally {
      setIsThreadsLoading(false);
    }
  }

  // Kullanici istegi: arama kutusuna basip Enter'a basinca ya da
  // "Ara" butonuna tiklayinca, 1. sayfadan itibaren arasin.
  function handlePhoneSearchSubmit() {
    setThreadsPage(1);
    fetchThreadsWithPhones();
  }

  async function fetchLogs() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (filterEventType) params.set("eventType", filterEventType);
      if (filterUserId) params.set("userId", filterUserId);
      if (filterThreadId) params.set("threadId", filterThreadId);

      const res = await fetch(`${API_BASE_URL}/admin/audit/logs?${params.toString()}`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      const data = await res.json();
      setLogs(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
      setIsUnlocked(false);
      sessionStorage.removeItem("admin_secret");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
  }

  function handleSearch() {
    setPage(1);
    fetchLogs();
  }

  async function handleRevealPhone(userId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit/users/${userId}/phone`, {
        headers: { "x-admin-secret": adminKey },
      });
      const data = await res.json();
      setRevealedPhones((prev) => ({ ...prev, [userId]: data.phoneNumber }));
    } catch {
      setError("Telefon numarası açılamadı.");
    }
  }

  async function handleRevealThreadMessages(threadId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit/threads/${threadId}/messages`, {
        headers: { "x-admin-secret": adminKey },
      });
      const data = await res.json();
      setRevealedThreadMessages((prev) => ({ ...prev, [threadId]: data }));
    } catch {
      setError("Arşivlenmiş mesajlar açılamadı.");
    }
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4">
        <Card lifted className="max-w-sm w-full space-y-4">
          <h1 className="font-display text-xl font-bold text-slate">Yönetim Girişi</h1>
          <Input
            label="Yönetim Anahtarı"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          {error && <p className="font-body text-sm text-coral">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={!adminKey}>
            Giriş Yap
          </Button>
        </Card>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">
          İşlem Günlükleri (Audit Log)
        </h1>
        <p className="font-body text-sm text-slate-light">
          Hukuki bir talep/soruşturma durumunda ispat ve belgeleme için kullanılır. Kullanıcı
          ID&apos;si veya thread ID&apos;si üzerinden gerçek telefon numarasını / arşivlenmiş
          mesajları açabilirsin.
        </p>

        {/* Kullanici istegi: "hangi telefon hangi telefona ne zaman
            mesaj atti" sorusuna TEK ekranda cevap veren liste. */}
        <h2 className="font-display text-lg font-bold text-slate">
          Tüm Mesajlaşmalar ({threadsTotal})
        </h2>
        <p className="font-body text-xs text-slate-light">
          Her satır bir konuşmayı temsil eder — telefon numaraları çözülmüş halde gösterilir.
          Bir satıra tıklayınca o konuşmanın tüm mesajları (gönderen telefonuyla birlikte)
          açılır.
        </p>
        {/* Kullanici istegi: belirli bir telefon numarasinin (orn.
            "5323770376" - format farki onemli degil) attigi/aldigi
            TUM mesajlari arayabilme. */}
        <div className="flex gap-2">
          <input
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePhoneSearchSubmit()}
            placeholder="Telefon numarası ile ara (örn. 5323770376)"
            className="flex-1 rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
          />
          <button
            onClick={handlePhoneSearchSubmit}
            className="rounded-full bg-sky px-4 py-2 font-body text-sm font-semibold text-white hover:bg-sky-hover"
          >
            Ara
          </button>
          {phoneSearch && (
            <button
              onClick={() => {
                setPhoneSearch("");
                setThreadsPage(1);
                fetchThreadsWithPhones("");
              }}
              className="rounded-full border-2 border-slate-light/40 px-4 py-2 font-body text-sm font-semibold text-slate-light hover:bg-mint"
            >
              Temizle
            </button>
          )}
        </div>
        {isThreadsLoading && (
          <p className="font-body text-sm text-slate-light">Yükleniyor...</p>
        )}
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse border border-slate-light/60 text-left">
            <thead>
              <tr className="bg-mint">
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Tarih
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Gönderen (Başlatan)
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Alıcı
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate w-20">
                  Mesaj
                </th>
              </tr>
            </thead>
            <tbody>
              {threadsWithPhones.map((t) => (
                <Fragment key={t.threadId}>
                  <tr
                    onClick={() => {
                      setExpandedThreadId(expandedThreadId === t.threadId ? null : t.threadId);
                      if (!revealedThreadMessages[t.threadId]) {
                        handleRevealThreadMessages(t.threadId);
                      }
                    }}
                    className="cursor-pointer hover:bg-mint/40"
                  >
                    <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate">
                      {t.initiatorPhone ?? "—"}
                      {t.initiatorDisplayName && (
                        <span className="text-slate-light"> ({t.initiatorDisplayName})</span>
                      )}
                    </td>
                    <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate">
                      {t.recipientPhone ?? "—"}
                      {t.recipientDisplayName && (
                        <span className="text-slate-light"> ({t.recipientDisplayName})</span>
                      )}
                    </td>
                    <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate text-center">
                      {t.messageCount}
                    </td>
                  </tr>
                  {expandedThreadId === t.threadId && (
                    <tr>
                      <td colSpan={4} className="border border-slate-light/60 bg-mint/20 px-3 py-2">
                        {!revealedThreadMessages[t.threadId] ? (
                          <p className="font-body text-xs text-slate-light">Yükleniyor...</p>
                        ) : (
                          <div className="space-y-1.5">
                            {revealedThreadMessages[t.threadId].map((m) => (
                              <div key={m.id} className="font-body text-xs text-slate">
                                <span className="font-semibold">
                                  {m.isAnonymous ? "🎭 Anonim" : (m.senderPhone ?? "Bilinmiyor")}
                                </span>{" "}
                                <span className="text-slate-light">
                                  ({new Date(m.createdAt).toLocaleString("tr-TR")})
                                </span>
                                : {m.body}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Card>
        {threadsTotal > 20 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setThreadsPage((p) => Math.max(1, p - 1))}
              disabled={threadsPage === 1}
              className="font-body text-sm text-sky disabled:opacity-40"
            >
              ← Önceki
            </button>
            <span className="font-body text-xs text-slate-light">Sayfa {threadsPage}</span>
            <button
              onClick={() => setThreadsPage((p) => p + 1)}
              disabled={threadsPage * 20 >= threadsTotal}
              className="font-body text-sm text-sky disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        )}

        {/* Filtreler */}
        <Card className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              placeholder="Olay tipi (örn. thread_reported)"
              className="rounded-xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate"
            />
            <input
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Kullanıcı ID"
              className="rounded-xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate"
            />
            <input
              value={filterThreadId}
              onChange={(e) => setFilterThreadId(e.target.value)}
              placeholder="Thread ID"
              className="rounded-xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            Filtrele
          </Button>
        </Card>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        <p className="font-body text-xs text-slate-light">{total} kayıt bulundu.</p>

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="rounded-full bg-sky-light px-2 py-0.5 font-body text-xs text-sky">
                  {log.eventType}
                </span>
                <span className="font-body text-xs text-slate-light">
                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                </span>
              </div>
              {log.ipAddress && (
                <p className="font-body text-xs text-slate-light">
                  IP: {log.ipAddress} {log.userAgent && `· ${log.userAgent.slice(0, 60)}`}
                </p>
              )}
              {/* Kullanici istegi: tarayici dili, IP'den yaklasik
                  sehir/ulke, ekran cozunurlugu ve saat dilimi de
                  gunlukte gosterilir. */}
              {(log.country || log.city || log.acceptLanguage || log.screenResolution || log.timezone) && (
                <p className="font-body text-xs text-slate-light">
                  {(log.city || log.country) && (
                    <>Konum: {[log.city, log.country].filter(Boolean).join(", ")} · </>
                  )}
                  {log.acceptLanguage && <>Dil: {log.acceptLanguage} · </>}
                  {log.screenResolution && <>Ekran: {log.screenResolution} · </>}
                  {log.timezone && <>Saat Dilimi: {log.timezone}</>}
                </p>
              )}
              {log.metadata && (
                <pre className="rounded-xl bg-mint p-2 font-body text-xs text-slate-light overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}

              {log.userId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-xs text-slate-light break-all">
                    Kullanıcı: {log.userId}
                  </span>
                  <button
                    onClick={() => handleRevealPhone(log.userId!)}
                    className="rounded-full border-2 border-slate-light/40 bg-white px-3 py-1 font-body text-xs text-slate hover:bg-mint"
                  >
                    Telefonu Göster
                  </button>
                  {revealedPhones[log.userId] !== undefined && (
                    <span className="font-body text-xs font-semibold text-coral">
                      {revealedPhones[log.userId] ?? "(kayıtlı değil)"}
                    </span>
                  )}
                </div>
              )}

              {log.threadId && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-xs text-slate-light break-all">
                      Thread: {log.threadId}
                    </span>
                    <button
                      onClick={() => handleRevealThreadMessages(log.threadId!)}
                      className="rounded-full border-2 border-slate-light/40 bg-white px-3 py-1 font-body text-xs text-slate hover:bg-mint"
                    >
                      Arşivlenmiş Mesajları Göster
                    </button>
                  </div>
                  {revealedThreadMessages[log.threadId] && (
                    <div className="space-y-1 rounded-xl bg-coral-light/30 p-2">
                      {revealedThreadMessages[log.threadId].map((m) => (
                        <div key={m.id} className="font-body text-xs text-slate">
                          <span className="text-slate-light">
                            {new Date(m.createdAt).toLocaleString("tr-TR")}
                            {m.isAnonymous ? " (anonim)" : ""}:
                          </span>{" "}
                          {m.body}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border-2 border-slate-light/40 bg-white px-4 py-1.5 font-body text-sm text-slate disabled:opacity-40"
            >
              Önceki
            </button>
            <span className="font-body text-sm text-slate-light">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border-2 border-slate-light/40 bg-white px-4 py-1.5 font-body text-sm text-slate disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
