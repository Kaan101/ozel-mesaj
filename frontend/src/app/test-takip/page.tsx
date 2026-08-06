"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface TestCaseRecord {
  id: string;
  no: number;
  section: string;
  scenario: string;
  expectedResult: string;
  status: string;
  note: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const STATUS_OPTIONS = ["Test Edilmedi", "Başarılı", "Başarısız", "Kısmen Başarılı"];
const TESTER_STORAGE_KEY = "test_takip_tester_name";

// Kullanici istegi: ADMIN ALTINDA DEGIL, ayri, ekip tarafindan
// paylasilan bir test takip ekrani. "Testi Yapan" alanina girilen
// isim tarayicida hatirlanir - her guncelleme o isimle imzalanir.
// Baska biri kendi adini girip devam ederse, YENI guncellemeler
// ONUN adiyla kaydedilir (eski kayitlar degismez).
export default function TestTakipPage() {
  const [testerName, setTesterName] = useState("");
  const [cases, setCases] = useState<TestCaseRecord[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("__all__");

  // Kullanici istegi: yeni bir test senaryosu elle eklenebilsin.
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [newScenario, setNewScenario] = useState("");
  const [newExpectedResult, setNewExpectedResult] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TESTER_STORAGE_KEY);
    if (stored) setTesterName(stored);
    fetchCases();
  }, []);

  useEffect(() => {
    if (testerName) localStorage.setItem(TESTER_STORAGE_KEY, testerName);
  }, [testerName]);

  async function fetchCases() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/test-cases`);
      if (!res.ok) throw new Error();
      const data: TestCaseRecord[] = await res.json();
      setCases(data);
      const drafts: Record<string, string> = {};
      for (const c of data) drafts[c.id] = c.note ?? "";
      setNoteDrafts(drafts);
    } catch {
      setError("Test listesi yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdate(id: string, patch: { status?: string; note?: string }) {
    if (!testerName.trim()) {
      setError("Güncelleme yapmadan önce 'Testi Yapan' alanına adını gir.");
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/test-cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedBy: testerName.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated: TestCaseRecord = await res.json();
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setError("Güncellenemedi. Lütfen tekrar dene.");
    } finally {
      setSavingId(null);
    }
  }

  // Kullanici istegi: yeni bir test senaryosu elle eklenebilsin.
  async function handleAdd() {
    if (!newSection.trim() || !newScenario.trim() || !newExpectedResult.trim()) {
      setError("Yeni test eklemek için Bölüm, Senaryo ve Beklenen Sonuç alanlarını doldur.");
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: newSection,
          scenario: newScenario,
          expectedResult: newExpectedResult,
        }),
      });
      if (!res.ok) throw new Error();
      const created: TestCaseRecord = await res.json();
      setCases((prev) => [...prev, created]);
      setNoteDrafts((prev) => ({ ...prev, [created.id]: "" }));
      setNewSection("");
      setNewScenario("");
      setNewExpectedResult("");
      setIsAddFormOpen(false);
    } catch {
      setError("Yeni test eklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsAdding(false);
    }
  }

  // Kullanici istegi: sayilar (kac test var, kac hangi statude)
  // canli olarak, mevcut listeden hesaplanir.
  const stats = useMemo(() => {
    const total = cases.length;
    const success = cases.filter((c) => c.status === "Başarılı").length;
    const fail = cases.filter((c) => c.status === "Başarısız").length;
    const partial = cases.filter((c) => c.status === "Kısmen Başarılı").length;
    const untested = cases.filter((c) => c.status === "Test Edilmedi").length;
    return { total, success, fail, partial, untested };
  }, [cases]);

  const sections = useMemo(() => {
    const unique = [...new Set(cases.map((c) => c.section))];
    return unique;
  }, [cases]);

  const visibleCases = useMemo(() => {
    if (sectionFilter === "__all__") return cases;
    return cases.filter((c) => c.section === sectionFilter);
  }, [cases, sectionFilter]);

  function statusColor(status: string): string {
    if (status === "Başarılı") return "bg-meadow-light text-meadow-hover";
    if (status === "Başarısız") return "bg-coral-light text-coral";
    if (status === "Kısmen Başarılı") return "bg-[#FCF3CF] text-[#8a6d1a]";
    return "bg-slate-light/20 text-slate-light";
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          YouHaveMi — Test Takip Ekranı
        </h1>
        <p className="font-body text-sm text-slate-light">
          Bu ekran, ekip içinde paylaşılan canlı bir test kontrol listesidir. Herkes kendi adını
          girip test sonuçlarını işaretleyebilir.
        </p>

        {/* Testi yapan isim alani + test durumlari pasta grafigi -
            kullanici istegi geregi AYNI SATIRDA. */}
        <div className="flex flex-wrap items-stretch gap-4">
          <Card lifted className="max-w-sm flex-1">
            <Input
              label="Testi Yapan (adını gir, her güncelleme bu adla kaydedilir)"
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder="örn. Ayşe"
            />
          </Card>
          <Card lifted className="flex items-center gap-4">
            <StatusPieChart stats={stats} />
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5 font-body text-xs text-slate">
                <span className="h-2.5 w-2.5 rounded-full bg-meadow" /> Başarılı ({stats.success})
              </li>
              <li className="flex items-center gap-1.5 font-body text-xs text-slate">
                <span className="h-2.5 w-2.5 rounded-full bg-coral" /> Başarısız ({stats.fail})
              </li>
              <li className="flex items-center gap-1.5 font-body text-xs text-slate">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E0B93C]" /> Kısmen ({stats.partial})
              </li>
              <li className="flex items-center gap-1.5 font-body text-xs text-slate">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-light/50" /> Test Edilmedi (
                {stats.untested})
              </li>
            </ul>
          </Card>
        </div>

        {error && <p className="font-body text-sm text-coral">{error}</p>}
        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}

        {/* Istatistik ozeti - canli hesaplanir */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="text-center">
            <p className="font-display text-2xl font-bold text-slate">{stats.total}</p>
            <p className="font-body text-xs text-slate-light">Toplam Test</p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-bold text-meadow-hover">{stats.success}</p>
            <p className="font-body text-xs text-slate-light">Başarılı</p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-bold text-coral">{stats.fail}</p>
            <p className="font-body text-xs text-slate-light">Başarısız</p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-bold text-[#8a6d1a]">{stats.partial}</p>
            <p className="font-body text-xs text-slate-light">Kısmen Başarılı</p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-bold text-slate-light">{stats.untested}</p>
            <p className="font-body text-xs text-slate-light">Test Edilmedi</p>
          </Card>
        </div>

        {/* Bolum filtresi + Test Case Ekle butonu */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="font-body text-sm font-semibold text-slate">Bölüm:</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
            >
              <option value="__all__">Tüm Bölümler</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {/* Kullanici istegi: yeni bir test senaryosu elle
              eklenebilsin. */}
          <button
            type="button"
            onClick={() => setIsAddFormOpen((v) => !v)}
            className="rounded-full bg-sky px-4 py-2 font-body text-sm font-semibold text-white hover:bg-sky-hover"
          >
            + Test Case Ekle
          </button>
        </div>

        {isAddFormOpen && (
          <Card lifted className="space-y-3">
            <h2 className="font-display text-base font-bold text-slate">Yeni Test Case Ekle</h2>
            <Input
              label="Bölüm (örn. 12. Yeni Özellik)"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
            />
            <Input
              label="Test Senaryosu"
              value={newScenario}
              onChange={(e) => setNewScenario(e.target.value)}
            />
            <Input
              label="Beklenen Sonuç"
              value={newExpectedResult}
              onChange={(e) => setNewExpectedResult(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className="flex-1 rounded-full bg-meadow px-4 py-2 font-body text-sm font-semibold text-white hover:bg-meadow-hover disabled:opacity-50"
              >
                {isAdding ? "Ekleniyor..." : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="rounded-full border-2 border-slate-light/40 px-4 py-2 font-body text-sm font-semibold text-slate-light hover:bg-mint"
              >
                Vazgeç
              </button>
            </div>
          </Card>
        )}

        {/* Test tablosu */}
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse border border-slate-light/60 text-left">
            <thead>
              <tr className="bg-mint">
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate w-10">
                  No
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Bölüm
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Test Senaryosu
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Beklenen Sonuç
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate w-36">
                  Durum
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate">
                  Not
                </th>
                <th className="border border-slate-light/60 px-3 py-2 font-display text-xs font-bold text-slate w-32">
                  Güncelleyen
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCases.map((c) => (
                <tr key={c.id}>
                  <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate text-center">
                    {c.no}
                  </td>
                  <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate whitespace-nowrap">
                    {c.section}
                  </td>
                  <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate">
                    {c.scenario}
                  </td>
                  <td className="border border-slate-light/60 px-3 py-2 font-body text-xs text-slate-light">
                    {c.expectedResult}
                  </td>
                  <td className="border border-slate-light/60 px-2 py-2">
                    <select
                      value={c.status}
                      onChange={(e) => handleUpdate(c.id, { status: e.target.value })}
                      disabled={savingId === c.id}
                      className={`w-full rounded-full border-2 border-transparent px-2 py-1 font-body text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky/20 disabled:opacity-50 ${statusColor(c.status)}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-light/60 px-2 py-2">
                    <input
                      value={noteDrafts[c.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      onBlur={() => {
                        if ((noteDrafts[c.id] ?? "") !== (c.note ?? "")) {
                          handleUpdate(c.id, { note: noteDrafts[c.id] ?? "" });
                        }
                      }}
                      placeholder="Not ekle..."
                      className="w-full rounded-2xl border-2 border-sky-light bg-white px-2 py-1 font-body text-xs text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                    />
                  </td>
                  <td className="border border-slate-light/60 px-3 py-2 font-body text-[11px] text-slate-light whitespace-nowrap">
                    {c.lastUpdatedBy ? (
                      <>
                        <span className="font-semibold text-slate">{c.lastUpdatedBy}</span>
                        {c.lastUpdatedAt && (
                          <>
                            <br />
                            {new Date(c.lastUpdatedAt).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}

// Kullanici istegi: test durumlarini (Basarili/Basarisiz/Kismen/Test
// Edilmedi) gosteren bir pasta grafigi - herhangi bir yeni kutuphane
// eklenmeden, saf SVG ile cizilir.
function StatusPieChart({
  stats,
}: {
  stats: { total: number; success: number; fail: number; partial: number; untested: number };
}) {
  const size = 96;
  const radius = size / 2;
  const center = size / 2;

  const segments = [
    { value: stats.success, color: "#45B78C" }, // meadow
    { value: stats.fail, color: "#E8604C" }, // coral
    { value: stats.partial, color: "#E0B93C" },
    { value: stats.untested, color: "#B8C2CC" }, // slate-light benzeri
  ];

  if (stats.total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius - 2} fill="#EAEFF2" />
      </svg>
    );
  }

  function polarToCartesian(angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: center + (radius - 2) * Math.cos(angleRad),
      y: center + (radius - 2) * Math.sin(angleRad),
    };
  }

  let cumulativeAngle = 0;
  const paths = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const angle = (s.value / stats.total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      // Tek dilim (%100) ozel durumu - tam daire cizmek icin.
      if (angle >= 359.999) {
        return (
          <circle key={i} cx={center} cy={center} r={radius - 2} fill={s.color} />
        );
      }

      const start = polarToCartesian(startAngle);
      const end = polarToCartesian(endAngle);
      const largeArcFlag = angle > 180 ? 1 : 0;
      const d = `M ${center} ${center} L ${start.x} ${start.y} A ${radius - 2} ${radius - 2} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
      return <path key={i} d={d} fill={s.color} />;
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      {/* Ortasi bosluklu (donut) gorunum icin beyaz ic daire. */}
      <circle cx={center} cy={center} r={radius * 0.55} fill="white" />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-display"
        fontSize="16"
        fontWeight="700"
        fill="#22303F"
      >
        {stats.total}
      </text>
    </svg>
  );
}
