import { exec } from "child_process";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import fetch from "node-fetch"; // Import node-fetch
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import ViteExpress from "vite-express";
import { Worker } from "worker_threads"; // Import Worker from worker_threads
import { accountsTable, envsTable, pagesTable } from "./schema.js";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = drizzle(process.env.DB_FILE_NAME);

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

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

app.post("/pages/api/save-and-deploy", async (req, res) => {
  try {
    const { selectedRepo, pageName, branch, buildScript, envVars } = req.body;

    if (!pageName || !branch) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let page;
    if (selectedRepo.id) {
      // Update existing page
      [page] = await db
        .update(pagesTable)
        .set({
          name: pageName,
          branch,
          buildScript: buildScript || null,
        })
        .where(eq(pagesTable.id, selectedRepo.id))
        .returning({ id: pagesTable.id });
    } else {
      // Insert new page
      [page] = await db
        .insert(pagesTable)
        .values({
          repo: selectedRepo.full_name,
          name: pageName,
          branch,
          buildScript: buildScript || null,
        })
        .returning({ id: pagesTable.id });
    }

    // Delete existing environment variables for the page (if updating)
    if (selectedRepo.id) {
      await db.delete(envsTable).where(eq(envsTable.pageId, selectedRepo.id));
    }

    // Save environment variables to envsTable
    for (const env of envVars) {
      await db.insert(envsTable).values({
        pageId: page.id,
        name: env.name,
        value: env.value,
      });
    }

    // Trigger the build worker using a worker thread
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId: page.id },
    });

    worker.on("message", (message) => {
      console.log(`Worker message: ${message}`);
    });

    worker.on("error", (error) => {
      console.error(`Worker error: ${error.message}`);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      } else {
        console.log("Worker completed successfully.");
      }
    });

    res.json({ message: "Page saved and deployment triggered successfully" });
  } catch (error) {
    console.error("Error during save and deploy:", error);
    res
      .status(500)
      .json({ error: "Failed to save and deploy", details: error.message });
  }
});

const execPromise = (command) =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port ${PORT}...`)
);
