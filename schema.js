import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pagesTable = sqliteTable("pages_table", {
  id: int().primaryKey({ autoIncrement: true }),
  repo: text().notNull(),
  name: text().notNull(),
  branch: text().notNull(),
  buildScript: text().notNull(),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text(),
});

export const envsTable = sqliteTable("envs_table", {
  id: int().primaryKey({ autoIncrement: true }),
  pageId: int()
    .notNull()
    .references(() => pagesTable.id, { onDelete: "cascade" }),
  name: text().notNull(),
  value: text().notNull(),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text(),
});
