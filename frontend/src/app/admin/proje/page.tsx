"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<Task["status"], string> = {
  pending: "bg-sun/30 text-slate",
  in_progress: "bg-sky-light text-sky",
  completed: "bg-meadow-light text-meadow-hover",
  cancelled: "bg-coral-light text-coral",
};

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Kullanici istegi: yonetim panelinde proje/gorev takip ekrani.
// Ayni ADMIN_SECRET korumasini (/admin/ayarlar ile ayni sessionStorage
// anahtarini) kullanir. Tarih girilmezse bugunun tarihi varsayilan
// olarak kullanilir. Satira tiklayinca asagi dogru acilip duzenlenebilir
// hale gelir - silme sadece bu duzenleme gorunumunde mumkun.
export default function AdminProjePage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newDueDate, setNewDueDate] = useState(todayIsoDate());
  const [isCreating, setIsCreating] = useState(false);

  // Genisletilmis (duzenleme modundaki) gorev ve onun taslak degerleri.
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("pending");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, statusFilter, priorityFilter]);

  async function fetchTasks() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`${API_BASE_URL}/admin/tasks?${params.toString()}`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      setTasks(await res.json());
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

  async function handleCreate() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          priority: newPriority,
          // Tarih girilmediyse (bos birakilmis olma ihtimaline karsi)
          // bugunun tarihini kullan.
          dueDate: newDueDate || todayIsoDate(),
        }),
      });
      if (!res.ok) throw new Error("Oluşturulamadı.");
      setNewTitle("");
      setNewDescription("");
      setNewDueDate(todayIsoDate());
      setNewPriority("medium");
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  function toggleExpand(task: Task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : todayIsoDate());
    setEditStatus(task.status);
  }

  async function handleSaveEdit(id: string) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || undefined,
          priority: editPriority,
          status: editStatus,
          dueDate: editDueDate || todayIsoDate(),
        }),
      });
      if (!res.ok) throw new Error("Güncellenemedi.");
      setExpandedTaskId(null);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`${API_BASE_URL}/admin/tasks/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminKey },
      });
      setExpandedTaskId(null);
      await fetchTasks();
    } catch {
      setError("Silinemedi.");
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

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate">Proje / Görev Takibi</h1>

        {/* Yeni görev formu - iki satir: ust satir baslik+oncelik+tarih+ekle, alt satir aciklama */}
        <Card className="space-y-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Görev başlığı..."
              className="min-w-[160px] flex-1 rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:border-sky"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
              className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
            >
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
            />
            <Button onClick={handleCreate} disabled={isCreating || !newTitle}>
              {isCreating ? "..." : "Ekle"}
            </Button>
          </div>
          <div>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Açıklama (opsiyonel)..."
              className="w-full rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:border-sky"
            />
          </div>
        </Card>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border-2 border-sky-light bg-white px-4 py-1.5 font-body text-sm text-slate"
          >
            <option value="">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="in_progress">Geliştirme</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-full border-2 border-sky-light bg-white px-4 py-1.5 font-body text-sm text-slate"
          >
            <option value="">Tüm Öncelikler</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>
        </div>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : tasks.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">Görev yok.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-bubble bg-white shadow-soft">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-light/50">
                  <th className="px-4 py-2 font-display text-xs font-bold text-slate-light">
                    Başlık
                  </th>
                  <th className="px-4 py-2 font-display text-xs font-bold text-slate-light">
                    Öncelik
                  </th>
                  <th className="px-4 py-2 font-display text-xs font-bold text-slate-light">
                    Durum
                  </th>
                  <th className="px-4 py-2 font-display text-xs font-bold text-slate-light">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <Fragment key={task.id}>
                    <tr
                      onClick={() => toggleExpand(task)}
                      className="cursor-pointer border-b border-sky-light/30 last:border-0 hover:bg-mint/50"
                    >
                      <td className="px-4 py-2 font-body text-sm text-slate">{task.title}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-whisper-light px-2 py-0.5 font-body text-xs text-slate">
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 font-body text-xs ${STATUS_COLORS[task.status]}`}
                        >
                          {task.status === "pending"
                            ? "Bekliyor"
                            : task.status === "in_progress"
                              ? "Geliştirme"
                              : task.status === "completed"
                                ? "Tamamlandı"
                                : "İptal"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-body text-xs text-slate-light whitespace-nowrap">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("tr-TR")
                          : "—"}
                      </td>
                    </tr>
                    {expandedTaskId === task.id && (
                      <tr className="border-b border-sky-light/30 last:border-0 bg-mint/40">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Başlık"
                              className="w-full rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Açıklama"
                              rows={2}
                              className="w-full rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={editPriority}
                                onChange={(e) =>
                                  setEditPriority(e.target.value as Task["priority"])
                                }
                                className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
                              >
                                <option value="low">Düşük</option>
                                <option value="medium">Orta</option>
                                <option value="high">Yüksek</option>
                              </select>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as Task["status"])}
                                className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
                              >
                                <option value="pending">Bekliyor</option>
                                <option value="in_progress">Geliştirme</option>
                                <option value="completed">Tamamlandı</option>
                                <option value="cancelled">İptal</option>
                              </select>
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="rounded-full border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setExpandedTaskId(null)}
                                className="rounded-full border-2 border-slate-light/40 bg-white px-4 py-1.5 font-body text-sm text-slate hover:bg-mint"
                              >
                                Vazgeç
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="rounded-full border-2 border-slate-light/40 bg-white px-4 py-1.5 font-body text-sm text-coral hover:bg-coral-light"
                              >
                                Sil
                              </button>
                              <Button
                                variant="secondary"
                                onClick={() => handleSaveEdit(task.id)}
                                disabled={isSaving || !editTitle}
                              >
                                {isSaving ? "Kaydediliyor..." : "Kaydet"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
