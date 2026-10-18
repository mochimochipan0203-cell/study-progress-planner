import { and, asc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { studyMaterials } from "../../../db/schema";

const subjects = new Set(["国語", "数学", "理科", "社会", "英語", "その他"]);
const units = new Set(["ページ", "問"]);

function unauthorized() {
  return Response.json({ error: "authentication_required", signInPath: chatGPTSignInPath("/") }, { status: 401 });
}

function toClient(row: typeof studyMaterials.$inferSelect) {
  let unavailableDates: string[] = [];
  try {
    const parsed = JSON.parse(row.unavailableDates);
    if (Array.isArray(parsed)) unavailableDates = parsed.filter((value): value is string => typeof value === "string");
  } catch {}
  return { ...row, unavailableDates, order: row.sortOrder };
}

function validateMaterial(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const total = Number(value.total);
  const progress = Number(value.progress);
  const dailyAmount = Number(value.dailyAmount);
  const order = Number(value.order);
  if (
    typeof value.id !== "string" || !value.id ||
    typeof value.title !== "string" || !value.title.trim() ||
    typeof value.subject !== "string" || !subjects.has(value.subject) ||
    typeof value.unit !== "string" || !units.has(value.unit) ||
    !Number.isFinite(total) || total <= 0 ||
    !Number.isFinite(progress) || progress < 0 ||
    !Number.isFinite(dailyAmount) || dailyAmount <= 0 ||
    typeof value.startDate !== "string" ||
    typeof value.dueDate !== "string" || value.startDate > value.dueDate ||
    !Array.isArray(value.unavailableDates) ||
    !Number.isFinite(order) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) return null;

  return {
    id: value.id,
    title: value.title.trim(),
    subject: value.subject,
    unit: value.unit,
    total,
    progress: Math.min(progress, total),
    dailyAmount,
    startDate: value.startDate,
    dueDate: value.dueDate,
    unavailableDates: JSON.stringify(value.unavailableDates.filter((date): date is string => typeof date === "string")),
    sortOrder: Math.trunc(order),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const rows = await getDb().select().from(studyMaterials).where(eq(studyMaterials.userId, user.userId)).orderBy(asc(studyMaterials.sortOrder), asc(studyMaterials.createdAt));
  return Response.json({ materials: rows.map(toClient) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const material = validateMaterial(await request.json());
  if (!material) return Response.json({ error: "invalid_material" }, { status: 400 });
  await getDb().insert(studyMaterials).values({ ...material, userId: user.userId });
  return Response.json({ material: toClient({ ...material, userId: user.userId }) }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const material = validateMaterial(await request.json());
  if (!material) return Response.json({ error: "invalid_material" }, { status: 400 });
  const result = await getDb().update(studyMaterials).set(material).where(and(eq(studyMaterials.id, material.id), eq(studyMaterials.userId, user.userId))).returning();
  if (!result.length) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ material: toClient(result[0]) });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const body = await request.json() as { orders?: Array<{ id?: unknown; order?: unknown }> };
  const orders = body.orders
    ?.filter((entry) => typeof entry.id === "string" && Number.isFinite(Number(entry.order)))
    .map((entry) => ({ id: entry.id as string, order: Math.trunc(Number(entry.order)) })) ?? [];
  for (const entry of orders) {
    await getDb().update(studyMaterials).set({ sortOrder: entry.order, updatedAt: new Date().toISOString() }).where(and(eq(studyMaterials.id, entry.id), eq(studyMaterials.userId, user.userId)));
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id_required" }, { status: 400 });
  await getDb().delete(studyMaterials).where(and(eq(studyMaterials.id, id), eq(studyMaterials.userId, user.userId)));
  return Response.json({ ok: true });
}
