import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { accountsTable } from "./schema.js"; // Import the accountsTable schema
import { eq } from "drizzle-orm"; // Import any necessary helpers for queries

const db = drizzle(process.env.DB_FILE_NAME);

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/pages/api/provider-accounts", async (req, res) => {
  try {
    const providerAccounts = await db
      .select()
      .from(accountsTable)
      .fields("providerAccountId", "provider", "type"); // Select specific fields
    res.json(providerAccounts);
  } catch (error) {
    console.error("Error fetching provider accounts:", error);
    res.status(500).json({ error: "Failed to fetch provider accounts" });
  }
});

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port ${PORT}...`)
);
