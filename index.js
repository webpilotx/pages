import fetch from "node-fetch"; // Import node-fetch
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import ViteExpress from "vite-express";
import { accountsTable, pagesTable } from "./schema.js";

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

app.get("/pages/api/pages-list", async (req, res) => {
  try {
    const pagesList = await db.select().from(pagesTable);
    res.json(pagesList);
  } catch (error) {
    console.error("Error fetching pages list:", error);
    res.status(500).json({ error: "Failed to fetch pages list" });
  }
});

app.get("/pages/api/repositories", async (req, res) => {
  try {
    const repositories = await db.select().from(accountsTable); // Assuming repositories are stored in accountsTable
    res.json(repositories);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

app.get("/pages/api/github/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing code parameter" });
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.VITE_GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Error during token exchange:", tokenData);
      return res
        .status(400)
        .json({ error: "Failed to retrieve access token", details: tokenData });
    }

    console.log({ tokenData });

    const { access_token } = tokenData;

    if (!access_token) {
      return res.status(400).json({
        error: "Access token not found in response",
        details: tokenData,
      });
    }

    // Fetch user information using the access token
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Error fetching user information:", userData);
      return res
        .status(400)
        .json({ error: "Failed to fetch user information", details: userData });
    }

    console.log({ userData });

    const { login } = userData;

    await db.insert(accountsTable).values({ login, accessToken: access_token });

    // Respond with success
    res.json({ message: "GitHub account connected successfully" });
  } catch (error) {
    console.error("Error handling GitHub callback:", error);
    res.status(500).json({
      error: "Failed to handle GitHub callback",
      details: error.message,
    });
  }
});

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port ${PORT}...`)
);
