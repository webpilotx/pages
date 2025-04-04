import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import ViteExpress from "vite-express";
import { accountsTable } from "./schema.js";  

const db = drizzle(process.env.DB_FILE_NAME);

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/pages/api/provider-accounts", async (req, res) => {
  try {
    const providerAccounts = await db.select().from(accountsTable);
    res.json(providerAccounts);
  } catch (error) {
    console.error("Error fetching provider accounts:", error);
    res.status(500).json({ error: "Failed to fetch provider accounts" });
  }
});

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port ${PORT}...`)
);
