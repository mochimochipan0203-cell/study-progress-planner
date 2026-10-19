"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleMinus, CirclePlus, GripVertical, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { Material, Subject, Unit, availableDays, recommendedDaily, scheduleState, subjectColors, todayISO } from "@/lib/planner";

const subjects: Subject[] = ["国語", "数学", "理科", "社会", "英語", "その他"];
const initialForm = () => ({ title: "", subject: "数学" as Subject, unit: "ページ" as Unit, total: 100, progress: 0, dailyAmount: 10, startDate: todayISO(), dueDate: addDays(todayISO(), 14), unavailableDates: [] as string[] });

function addDays(date: string, amount: number) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function formatDate(date: string) { return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`)); }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => todayISO().slice(0, 7));
  const [sort, setSort] = useState("manual");
  const [subjectFilter, setSubjectFilter] = useState<Subject | "すべて">("すべて");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [customId, setCustomId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState(1);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/materials", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { materials?: Material[]; signInPath?: string; error?: string };
        if (response.status === 401 && body.signInPath) { window.location.assign(body.signInPath); return; }
        if (!response.ok) throw new Error(body.error ?? "load_failed");
        if (active) setMaterials(body.materials ?? []);
      })
      .catch(() => { if (active) setSyncError("クラウドから読み込めませんでした。再読み込みしてください。"); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { const close = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuId(null); }; window.addEventListener("pointerdown", close); return () => window.removeEventListener("pointerdown", close); }, []);

  const visible = useMemo(() => {
    let items = materials.filter((m) => (subjectFilter === "すべて" || m.subject === subjectFilter) && m.title.toLowerCase().includes(query.toLowerCase()));
    if (sort === "due") items = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (sort === "progress") items = [...items].sort((a, b) => b.progress / b.total - a.progress / a.total);
    if (sort === "created") items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "manual") items = [...items].sort((a, b) => a.order - b.order);
    return items;
  }, [materials, subjectFilter, query, sort]);

  function openCreate() { setEditingId(null); setForm(initialForm()); setCalendarMonth(todayISO().slice(0, 7)); setDialogOpen(true); }
  function openEdit(material: Material) { setEditingId(material.id); setForm({ title: material.title, subject: material.subject, unit: material.unit, total: material.total, progress: material.progress, dailyAmount: material.dailyAmount, startDate: material.startDate, dueDate: material.dueDate, unavailableDates: material.unavailableDates }); setCalendarMonth(material.startDate.slice(0, 7)); setMenuId(null); setDialogOpen(true); }
  async function request(method: string, body?: unknown, suffix = "") {
    const response = await fetch(`/api/materials${suffix}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json() as { signInPath?: string; error?: string };
    if (response.status === 401 && result.signInPath) { window.location.assign(result.signInPath); return; }
    if (!response.ok) { setSyncError("クラウドへの保存に失敗しました。再読み込みしてください。"); throw new Error(result.error ?? "save_failed"); }
    setSyncError("");
    return result;
  }
  function persistOrder(items: Material[]) { void request("PATCH", { orders: items.map((m) => ({ id: m.id, order: m.order })) }); }
  function saveMaterial(event: React.FormEvent) {
    event.preventDefault(); if (!form.title.trim() || form.total <= 0 || form.startDate > form.dueDate) return;
    const now = new Date().toISOString();
    if (editingId) {
      const previous = materials.find((m) => m.id === editingId); if (!previous) return;
      const updated = { ...previous, ...form, title: form.title.trim(), progress: Math.min(form.progress, form.total), updatedAt: now };
      setMaterials((items) => items.map((m) => m.id === editingId ? updated : m)); void request("PUT", updated);
    } else {
      const created: Material = { ...form, id: crypto.randomUUID(), title: form.title.trim(), order: materials.length, createdAt: now, updatedAt: now };
      setMaterials((items) => [...items, created]); void request("POST", created);
    }
    setDialogOpen(false);
  }
  function adjust(id: string, delta: number) { const current = materials.find((m) => m.id === id); if (!current) return; const updated = { ...current, progress: Math.max(0, Math.min(current.total, current.progress + delta)), updatedAt: new Date().toISOString() }; setMaterials((items) => items.map((m) => m.id === id ? updated : m)); void request("PUT", updated); }
  function remove(id: string) { if (window.confirm("この教材を削除しますか？")) { setMaterials((items) => items.filter((m) => m.id !== id)); void request("DELETE", undefined, `?id=${encodeURIComponent(id)}`); } setMenuId(null); }
  function duplicate(material: Material) { const now = new Date().toISOString(); const created = { ...material, id: crypto.randomUUID(), title: `${material.title} のコピー`, order: materials.length, createdAt: now, updatedAt: now }; setMaterials((items) => [...items, created]); void request("POST", created); setMenuId(null); }
  function move(id: string, direction: -1 | 1) { const ordered = [...materials].sort((a, b) => a.order - b.order); const index = ordered.findIndex((m) => m.id === id); const next = index + direction; if (next < 0 || next >= ordered.length) return; [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; const changed = ordered.map((m, i) => ({ ...m, order: i })); setMaterials(changed); persistOrder(changed); }
  function dropOn(targetId: string) { if (!draggedId || draggedId === targetId) return; const ordered = [...materials].sort((a, b) => a.order - b.order); const from = ordered.findIndex((m) => m.id === draggedId); const to = ordered.findIndex((m) => m.id === targetId); const [item] = ordered.splice(from, 1); ordered.splice(to, 0, item); const changed = ordered.map((m, i) => ({ ...m, order: i })); setMaterials(changed); persistOrder(changed); setDraggedId(null); }

  const totalDone = materials.reduce((sum, m) => sum + Math.min(m.progress / m.total, 1), 0);
  if (!loaded) return <AppSkeleton />;
  return <main className="app-shell">
    <header className="topbar glass"><div className="brand"><span className="brand-mark"><BookOpen size={19} /></span><span>study tracker</span></div><div className="header-actions"><label className="search"><Search size={17} /><input aria-label="教材を検索" placeholder="教材を検索" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="primary" onClick={openCreate}><Plus size={18} />新規作成</button></div></header>
    <section className="workspace">
      {syncError && <div className="sync-error" role="alert">{syncError}<button onClick={() => window.location.reload()}>再読み込み</button></div>}
      <div className="summary-row"><div><p className="eyebrow">教材一覧</p><h1>{materials.length}件の教材</h1></div><div className="summary-stats glass-subtle"><span><b>{materials.filter((m) => m.progress >= m.total).length}</b> 完了</span><i /><span><b>{materials.length ? Math.round(totalDone / materials.length * 100) : 0}%</b> 全体</span></div></div>
      <div className="toolbar"><div className="subject-tabs" role="tablist" aria-label="教科フィルター">{(["すべて", ...subjects] as const).map((subject) => <button role="tab" aria-selected={subjectFilter === subject} key={subject} onClick={() => setSubjectFilter(subject)} className={subjectFilter === subject ? "active" : ""}>{subject !== "すべて" && <span style={{ background: subjectColors[subject] }} />}{subject}</button>)}</div><label className="sort"><Settings2 size={16} /><select aria-label="並び順" value={sort} onChange={(e) => setSort(e.target.value)}><option value="manual">手動</option><option value="due">期限が近い順</option><option value="progress">進捗が多い順</option><option value="created">新しい順</option></select></label></div>
      {visible.length === 0 ? <EmptyState onCreate={openCreate} hasAny={materials.length > 0} /> : <div className="card-grid">{visible.map((material) => {
        const percent = Math.min(100, Math.round(material.progress / material.total * 100)); const state = scheduleState(material); const recommended = recommendedDaily(material); const remainingDays = availableDays(material, todayISO()).length;
        return <article key={material.id} className={`material-card ${draggedId === material.id ? "dragging" : ""}`} style={{ "--subject": subjectColors[material.subject] } as React.CSSProperties} draggable={sort === "manual"} onDragStart={() => setDraggedId(material.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(material.id)} onContextMenu={(e) => { e.preventDefault(); setMenuId(material.id); }}>
          <div className="card-top"><div className="card-title-wrap">{sort === "manual" && <GripVertical className="grip" size={18} />}<div className="card-title-content"><span className="subject-pill">{material.subject}</span><div className="card-heading-row"><h2>{material.title}</h2><span className={`status ${state.kind}`}>{state.kind === "complete" && <Check size={12} />}{state.label}</span><span className="dates"><CalendarDays size={12} />期限 {formatDate(material.dueDate)}</span></div></div></div><button className="icon-button" aria-label={`${material.title}のメニュー`} onClick={(e) => { e.stopPropagation(); setMenuId(menuId === material.id ? null : material.id); }}><MoreHorizontal size={20} /></button>{menuId === material.id && <div className="context-menu glass" ref={menuRef} onPointerDown={(e) => e.stopPropagation()}><button onClick={() => openEdit(material)}><Pencil size={16} />編集</button><button onClick={() => duplicate(material)}><Sparkles size={16} />複製</button>{sort === "manual" && <><button onClick={() => move(material.id, -1)}><ArrowUp size={16} />上へ移動</button><button onClick={() => move(material.id, 1)}><ArrowDown size={16} />下へ移動</button></>}<button className="danger" onClick={() => remove(material.id)}><Trash2 size={16} />削除</button></div>}</div>
          <div className="progress-head"><span>進捗</span><strong>{formatNumber(material.progress)} <small>/ {formatNumber(material.total)} {material.unit}</small></strong></div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><div className="percent">{percent}%</div>
          <div className="pace-grid"><div><span>一日の設定</span><b>{formatNumber(material.dailyAmount)} {material.unit}</b></div><div><span>現在の目安</span><b>{formatNumber(recommended)} {material.unit}</b></div><div><span>残り学習日</span><b>{remainingDays} 日</b></div></div>
          <div className="stepper"><button aria-label={`${material.dailyAmount}${material.unit}戻す`} onClick={() => adjust(material.id, -material.dailyAmount)} disabled={material.progress <= 0}><CircleMinus size={22} /><span>{formatNumber(material.dailyAmount)} 戻す</span></button><button className="custom" onClick={() => { setCustomId(material.id); setCustomValue(1); }}>カスタム</button><button className="advance" aria-label={`${material.dailyAmount}${material.unit}進める`} onClick={() => adjust(material.id, material.dailyAmount)} disabled={material.progress >= material.total}><CirclePlus size={22} /><span>{formatNumber(material.dailyAmount)} 進める</span></button></div>
        </article>;
      })}</div>}
    </section>
    {dialogOpen && <MaterialDialog form={form} setForm={setForm} editing={!!editingId} onClose={() => setDialogOpen(false)} onSubmit={saveMaterial} onCalendar={() => setCalendarOpen(true)} />}
    {calendarOpen && <UnavailableCalendar month={calendarMonth} setMonth={setCalendarMonth} selected={form.unavailableDates} start={form.startDate} end={form.dueDate} onToggle={(date) => setForm((f) => ({ ...f, unavailableDates: f.unavailableDates.includes(date) ? f.unavailableDates.filter((d) => d !== date) : [...f.unavailableDates, date] }))} onClose={() => setCalendarOpen(false)} />}
    {customId && <CustomDialog value={customValue} setValue={setCustomValue} onClose={() => setCustomId(null)} onApply={(sign) => { adjust(customId, sign * customValue); setCustomId(null); }} />}
  </main>;
}

type FormState = ReturnType<typeof initialForm>;
function MaterialDialog({ form, setForm, editing, onClose, onSubmit, onCalendar }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; editing: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; onCalendar: () => void }) {
  const preview = recommendedDaily({ ...form });
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><form className="modal glass" onSubmit={onSubmit}><div className="modal-head"><div><p className="eyebrow">{editing ? "教材を編集" : "教材を追加"}</p><h2>{editing ? "設定を更新" : "新しい学習計画"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="閉じる"><X /></button></div>
    <label className="field wide"><span>教材名</span><input autoFocus required placeholder="例：数学 基礎問題精講" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></label>
    <div className="form-grid"><label className="field"><span>教科</span><select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value as Subject }))}>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label><label className="field"><span>単位</span><div className="segmented"><button type="button" className={form.unit === "ページ" ? "active" : ""} onClick={() => setForm((f) => ({ ...f, unit: "ページ" }))}>ページ数</button><button type="button" className={form.unit === "問" ? "active" : ""} onClick={() => setForm((f) => ({ ...f, unit: "問" }))}>問題数</button></div></label><label className="field"><span>やる必要のある量</span><input type="number" min="0.01" step="0.01" required value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: Number(e.target.value) }))} /></label><label className="field"><span>一日にやる量</span><input type="number" min="0.01" step="0.01" required value={form.dailyAmount} onChange={(e) => setForm((f) => ({ ...f, dailyAmount: Number(e.target.value) }))} /></label><label className="field"><span>開始日</span><input type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, unavailableDates: f.unavailableDates.filter((d) => d >= e.target.value) }))} /></label><label className="field"><span>期限</span><input type="date" required min={form.startDate} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value, unavailableDates: f.unavailableDates.filter((d) => d <= e.target.value) }))} /></label></div>
    <button type="button" className="unavailable-button" onClick={onCalendar}><CalendarDays size={20} /><span><b>できない日を選択</b><small>{form.unavailableDates.length ? `${form.unavailableDates.length}日を除外中` : "予定のある日を計算から外せます"}</small></span><ChevronRight size={18} /></button>
    <div className="calculation"><span>逆算した一日の目安</span><strong>{formatNumber(preview)} <small>{form.unit} / 日</small></strong><p>学習できる {availableDays(form).length} 日で計算・小数第2位まで表示</p></div>{form.startDate > form.dueDate && <p className="form-error">期限は開始日以降にしてください。</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>キャンセル</button><button className="primary" disabled={!form.title.trim() || form.startDate > form.dueDate}>{editing ? "更新する" : "作成する"}</button></div>
  </form></div>;
}

function UnavailableCalendar({ month, setMonth, selected, start, end, onToggle, onClose }: { month: string; setMonth: (m: string) => void; selected: string[]; start: string; end: string; onToggle: (d: string) => void; onClose: () => void }) {
  const [year, mon] = month.split("-").map(Number); const first = new Date(year, mon - 1, 1); const last = new Date(year, mon, 0); const cells: (string | null)[] = Array(first.getDay()).fill(null); for (let day = 1; day <= last.getDate(); day++) cells.push(`${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`); const changeMonth = (delta: number) => { const d = new Date(year, mon - 1 + delta, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  return <div className="modal-backdrop calendar-layer"><div className="calendar-modal glass"><div className="modal-head"><div><p className="eyebrow">学習除外日</p><h2>できない日を選択</h2></div><button className="icon-button" onClick={onClose}><X /></button></div><div className="month-nav"><button onClick={() => changeMonth(-1)}><ChevronLeft /></button><b>{year}年 {mon}月</b><button onClick={() => changeMonth(1)}><ChevronRight /></button></div><div className="calendar-grid">{["日", "月", "火", "水", "木", "金", "土"].map((d) => <span className="weekday" key={d}>{d}</span>)}{cells.map((date, i) => date ? <button key={date} disabled={date < start || date > end} className={selected.includes(date) ? "selected" : ""} onClick={() => onToggle(date)}>{Number(date.slice(-2))}</button> : <i key={`blank-${i}`} />)}</div><p className="calendar-note"><span />色のついた日は学習日数から除外されます</p><button className="primary full" onClick={onClose}>完了</button></div></div>;
}
function CustomDialog({ value, setValue, onClose, onApply }: { value: number; setValue: (n: number) => void; onClose: () => void; onApply: (sign: -1 | 1) => void }) { return <div className="modal-backdrop calendar-layer"><div className="custom-modal glass"><div className="modal-head"><div><p className="eyebrow">カスタム進捗</p><h2>変更する量</h2></div><button className="icon-button" onClick={onClose}><X /></button></div><input aria-label="変更する量" type="number" min="0.01" step="0.01" autoFocus value={value} onChange={(e) => setValue(Math.max(0, Number(e.target.value)))} /><div className="custom-actions"><button onClick={() => onApply(-1)}><RotateCcw size={18} />戻す</button><button className="primary" onClick={() => onApply(1)}><Plus size={18} />進める</button></div></div></div>; }
function EmptyState({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) { return <div className="empty-state"><div><BookOpen size={28} /></div><h2>{hasAny ? "条件に合う教材がありません" : "教材がありません"}</h2><p>{hasAny ? "検索や教科フィルターを変更してください。" : "教材を追加すると、期限から一日の目安を逆算します。"}</p>{!hasAny && <button className="primary" onClick={onCreate}><Plus size={18} />新規作成</button>}</div>; }
function AppSkeleton() { return <main className="app-shell skeleton-shell"><header className="topbar glass"><div className="skeleton s-logo" /><div className="skeleton s-action" /></header><section className="workspace"><div className="skeleton s-title" /><div className="skeleton s-tabs" /><div className="card-grid">{[1,2,3].map((i) => <div className="material-card" key={i}><div className="skeleton s-card-title" /><div className="skeleton s-card-line" /><div className="skeleton s-progress" /><div className="skeleton s-card-block" /></div>)}</div></section></main>; }
