import fetch from "node-fetch"; // Import node-fetch
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import ViteExpress from "vite-express";
import { accountsTable, pagesTable } from "./schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DB_FILE_NAME);

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/pages/api/provider-accounts", async (req, res) => {
  try {
    const providerAccounts = await db
      .select({
        login: accountsTable.login, // Select the login field
      })
      .from(accountsTable);
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
    // Fetch all connected accounts
    const accounts = await db
      .select({
        login: accountsTable.login,
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable);

    if (!accounts.length) {
      return res.json({ repositories: [] });
    }

    // Fetch repositories from all accounts in parallel
    const allRepositories = (
      await Promise.all(
        accounts.map(async (account) => {
          const userReposResponse = await fetch(
            "https://api.github.com/user/repos",
            {
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
              },
            }
          );

          const orgsResponse = await fetch("https://api.github.com/user/orgs", {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
            },
          });

          const userRepos = userReposResponse.ok
            ? await userReposResponse.json()
            : [];
          const orgs = orgsResponse.ok ? await orgsResponse.json() : [];

          // Fetch repositories for each organization
          const orgRepos = (
            await Promise.all(
              orgs.map(async (org) => {
                const orgReposResponse = await fetch(
                  `https://api.github.com/orgs/${org.login}/repos`,
                  {
                    headers: {
                      Authorization: `Bearer ${account.accessToken}`,
                    },
                  }
                );
                return orgReposResponse.ok ? await orgReposResponse.json() : [];
              })
            )
          ).flat();

          return [...userRepos, ...orgRepos];
        })
      )
    ).flat();

    // Respond with all repositories
    res.json({ repositories: allRepositories });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch repositories", details: error.message });
  }
});

app.get("/pages/api/branches", async (req, res) => {
  try {
    const { repo } = req.query;

    if (!repo) {
      return res.status(400).json({ error: "Missing repo parameter" });
    }

    // Fetch all connected accounts
    const accounts = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable);

    if (!accounts.length) {
      return res.status(404).json({ error: "No connected accounts found" });
    }

    // Use the first account's access token to fetch branches
    const response = await fetch(
      `https://api.github.com/repos/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${accounts[0].accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error fetching branches:", errorData);
      return res
        .status(500)
        .json({ error: "Failed to fetch branches", details: errorData });
    }

    const branches = await response.json();
    res.json({ branches: branches.map((branch) => branch.name) });
  } catch (error) {
    console.error("Error fetching branches:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch branches", details: error.message });
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

    const { login } = userData;

    await db.insert(accountsTable).values({ login, accessToken: access_token });

    // Redirect to /pages on success
    res.redirect("/pages");
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
