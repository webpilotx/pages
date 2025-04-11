import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accountsTable = sqliteTable("accounts_table", {
  login: text().primaryKey(),
  accessToken: text().notNull(),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text(),
});

export const pagesTable = sqliteTable("pages_table", {
  id: int().primaryKey({ autoIncrement: true }),
  accountLogin: text()
    .notNull()
    .references(() => accountsTable.login, { onDelete: "cascade" }),
  repo: text().notNull(),
  name: text().notNull(),
  branch: text().notNull(),
  buildScript: text(),
  buildOutputDir: text(), // Add buildOutputDir field
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

export const deploymentsTable = sqliteTable("deployments_table", {
  id: int().primaryKey({ autoIncrement: true }),
  pageId: int()
    .notNull()
    .references(() => pagesTable.id, { onDelete: "cascade" }),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  completedAt: text(),
  exitCode: int(),
});
