import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyMaterials = sqliteTable("study_materials", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  unit: text("unit").notNull(),
  total: real("total").notNull(),
  progress: real("progress").notNull().default(0),
  dailyAmount: real("daily_amount").notNull(),
  startDate: text("start_date").notNull(),
  dueDate: text("due_date").notNull(),
  unavailableDates: text("unavailable_dates").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
