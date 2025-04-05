import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import fs, { promises as fsPromises } from "fs"; // Import both fs and fs/promises
import fetch from "node-fetch"; // Import node-fetch
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import ViteExpress from "vite-express";
import { Worker, isMainThread } from "worker_threads"; // Import Worker from worker_threads
import {
  accountsTable,
  deploymentsTable,
  envsTable,
  pagesTable,
} from "./schema.js";

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
    const { selectedRepo, pageName, branch, buildScript, envVars, editPage } =
      req.body;

    if (!pageName || !branch || !selectedRepo || !selectedRepo.full_name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let page;
    if (editPage) {
      // Update existing page
      [page] = await db
        .update(pagesTable)
        .set({
          name: pageName,
          branch,
          buildScript: buildScript || null,
          repo: selectedRepo.full_name, // Ensure repo is updated
        })
        .where(eq(pagesTable.id, editPage.id))
        .returning({ id: pagesTable.id });
    } else {
      // Insert new page
      [page] = await db
        .insert(pagesTable)
        .values({
          repo: selectedRepo.full_name, // Ensure repo is set
          name: pageName,
          branch,
          buildScript: buildScript || null,
        })
        .returning({ id: pagesTable.id });
    }

    // Delete existing environment variables for the page (if updating)
    if (editPage) {
      await db.delete(envsTable).where(eq(envsTable.pageId, editPage.id));
    }

    // Ensure envVars is an array before iterating
    if (Array.isArray(envVars)) {
      // Save environment variables to envsTable
      for (const env of envVars) {
        await db.insert(envsTable).values({
          pageId: page.id,
          name: env.name,
          value: env.value,
        });
      }
    } else {
      console.warn("envVars is not an array. Skipping environment variables.");
    }

    // Insert a new deployment record
    const [deployment] = await db
      .insert(deploymentsTable)
      .values({ pageId: page.id })
      .returning({ id: deploymentsTable.id });

    // Initialize the log file with an initial text
    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fsPromises.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);
    console.log(`Creating log file: ${logFilePath}`);
    const initialLogText = "Deployment initialized. Logs will appear here.\n";
    await fsPromises.writeFile(logFilePath, initialLogText); // Initialize with text

    // Trigger the build worker using a worker thread
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId: page.id, deploymentId: deployment.id },
    });

    worker.on("error", (error) => {
      console.error(`Worker error: ${error.message}`);
    });

    worker.on("exit", async (code) => {
      console.log(`Worker exited with code ${code}`);
      const exitCode = code === 0 ? 0 : 1; // 0 for success, 1 for failure
      try {
        await db
          .update(deploymentsTable)
          .set({ exitCode, completedAt: new Date().toISOString() })
          .where(eq(deploymentsTable.id, deployment.id));
        console.log(`Deployment ${deployment.id} updated successfully.`);
      } catch (error) {
        console.error(`Failed to update deployment ${deployment.id}:`, error);
      }
    });

    res.json({
      message: "Page saved and deployment triggered successfully",
      deploymentId: deployment.id,
    });
  } catch (error) {
    console.error("Error during save and deploy:", error);
    res
      .status(500)
      .json({ error: "Failed to save and deploy", details: error.message });
  }
});

app.post("/pages/api/create-page", async (req, res) => {
  try {
    const { repo, name, branch } = req.body;

    if (!repo || !name || !branch) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert the new page into the database
    const [newPage] = await db
      .insert(pagesTable)
      .values({
        repo,
        name,
        branch,
      })
      .returning({
        id: pagesTable.id,
        repo: pagesTable.repo,
        name: pagesTable.name,
        branch: pagesTable.branch,
      });

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error creating new page:", error);
    res.status(500).json({ error: "Failed to create new page" });
  }
});

app.get("/pages/api/deployments", async (req, res) => {
  try {
    const { pageId } = req.query;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const deployments = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.pageId, pageId))
      .orderBy(deploymentsTable.createdAt);

    res.json(deployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
  }
});

app.get("/pages/api/deployment-log", async (req, res) => {
  try {
    const { deploymentId } = req.query;

    if (!deploymentId) {
      return res.status(400).json({ error: "Missing deploymentId parameter" });
    }

    const logFilePath = path.join(
      process.env.PAGES_DIR,
      "deployments",
      `${deploymentId}.log`
    );

    try {
      // Check if the log file exists
      await fsPromises.access(logFilePath);
    } catch {
      // If the log file doesn't exist yet, return an empty response
      return res.status(200).send("");
    }

    // Stream the log file content
    const logStream = fs.createReadStream(logFilePath, { encoding: "utf-8" });
    logStream.pipe(res);

    logStream.on("error", (error) => {
      console.error("Error streaming log file:", error);
      res.status(500).json({ error: "Failed to stream log file" });
    });
  } catch (error) {
    console.error("Error fetching deployment log:", error);
    res.status(500).json({ error: "Failed to fetch deployment log" });
  }
});

app.get("/pages/api/deployment-log-stream", async (req, res) => {
  try {
    const { deploymentId } = req.query;

    if (!deploymentId) {
      return res.status(400).json({ error: "Missing deploymentId parameter" });
    }

    const logFilePath = path.join(
      process.env.PAGES_DIR,
      "deployments",
      `${deploymentId}.log`
    );

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send an initial event to establish the connection
    res.write("event: connected\n");
    res.write("data: Log streaming started\n\n");

    // Watch the log file for changes and stream updates
    const watcher = fs.watch(logFilePath, { encoding: "utf-8" }, async () => {
      try {
        const logs = await fsPromises.readFile(logFilePath, "utf-8");
        res.write("event: log\n");
        res.write(`data: ${logs}\n\n`);
      } catch (error) {
        console.error("Error reading log file:", error);
        res.write("event: error\n");
        res.write("data: Failed to read log file\n\n");
      }
    });

    // Handle client disconnect
    req.on("close", () => {
      console.log(
        `Client disconnected from log stream for deployment ${deploymentId}`
      );
      watcher.close();
      res.end();
    });
  } catch (error) {
    console.error("Error streaming deployment log:", error);
    res.status(500).json({ error: "Failed to stream deployment log" });
  }
});

if (!isMainThread) {
  console.error("This code should not run in the worker thread.");
} else {
  // Main thread logic
  ViteExpress.listen(app, PORT, () =>
    console.log(`Server is listening on port ${PORT}...`)
  );
}
