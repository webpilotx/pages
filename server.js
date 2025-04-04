import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";

const db = drizzle(process.env.DB_FILE_NAME);

const app = express();

const PORT = process.env.PORT || 3000;

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port ${PORT}...`)
);
