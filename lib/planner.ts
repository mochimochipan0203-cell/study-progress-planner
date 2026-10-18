export type Subject = "国語" | "数学" | "理科" | "社会" | "英語" | "その他";
export type Unit = "ページ" | "問";

export type Material = {
  id: string;
  title: string;
  subject: Subject;
  unit: Unit;
  total: number;
  progress: number;
  dailyAmount: number;
  startDate: string;
  dueDate: string;
  unavailableDates: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

export const subjectColors: Record<Subject, string> = {
  国語: "#ef5b64", 数学: "#4d8df7", 理科: "#42b883", 社会: "#e8bb38", 英語: "#9b6ee8", その他: "#9ca3af",
};

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function enumerateDays(start: string, end: string) {
  if (!start || !end || start > end) return [];
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const finish = new Date(`${end}T12:00:00`);
  while (cursor <= finish) {
    days.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function availableDays(material: Pick<Material, "startDate" | "dueDate" | "unavailableDates">, from?: string) {
  const start = from && from > material.startDate ? from : material.startDate;
  const excluded = new Set(material.unavailableDates);
  return enumerateDays(start, material.dueDate).filter((date) => !excluded.has(date));
}

export function recommendedDaily(material: Pick<Material, "total" | "progress" | "startDate" | "dueDate" | "unavailableDates">, at = todayISO()) {
  const remaining = Math.max(0, material.total - material.progress);
  const days = availableDays(material, at).length;
  return days === 0 ? remaining : Math.round((remaining / days) * 100) / 100;
}

export function scheduleState(material: Material, at = todayISO()) {
  if (material.progress >= material.total) return { kind: "complete" as const, label: "完了", days: 0 };
  if (at < material.startDate) return { kind: "ready" as const, label: "開始前", days: 0 };
  const all = availableDays(material);
  // Compare against work that should have been completed before today.
  // This keeps a new plan "順調" at the start of its first study day.
  const elapsed = all.filter((day) => day < at).length;
  const baseline = all.length ? material.total / all.length : material.total;
  const expected = Math.min(material.total, baseline * elapsed);
  const pace = material.dailyAmount > 0 ? material.dailyAmount : baseline || 1;
  const difference = (material.progress - expected) / pace;
  const rounded = Math.round(Math.abs(difference) * 10) / 10;
  if (difference <= -0.45) return { kind: "late" as const, label: `${rounded}日分遅れ`, days: -rounded };
  if (difference >= 0.45) return { kind: "ahead" as const, label: `${rounded}日分余裕あり`, days: rounded };
  return { kind: "good" as const, label: "順調", days: 0 };
}
