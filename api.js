import { exec } from "child_process";
import crypto from "crypto";
import "dotenv/config";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import fs, { promises as fsPromises } from "fs";
import fetch from "node-fetch";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import {
  accountsTable,
  deploymentsTable,
  envsTable,
  pagesTable,
} from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = drizzle(process.env.DATABASE_URL);

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const PAGES_DIR = process.env.PAGES_DIR || "./pages_dir";
if (!fs.existsSync(PAGES_DIR)) {
  fs.mkdirSync(PAGES_DIR, { recursive: true });
}
const WEBHOOK_SECRET_FILE = path.join(PAGES_DIR, "webhook_secret");

function getOrCreateWebhookSecret() {
  if (!fs.existsSync(WEBHOOK_SECRET_FILE)) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(WEBHOOK_SECRET_FILE, secret, { encoding: "utf-8" });
    console.log("Generated and saved new webhook secret.");
  } else {
    console.log("Webhook secret loaded from file.");
  }
  return fs.readFileSync(WEBHOOK_SECRET_FILE, { encoding: "utf-8" });
}

const GITHUB_WEBHOOK_SECRET = getOrCreateWebhookSecret();

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout || stderr);
      }
    });
  });
};

app.get("/pages/api/provider-accounts", async (req, res) => {
  try {
    const providerAccounts = await db
      .select({
        login: accountsTable.login,
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
    const pagesList = await db
      .select({
        id: pagesTable.id,
        repo: pagesTable.repo,
        name: pagesTable.name,
        branch: pagesTable.branch,
        buildScript: pagesTable.buildScript,
        buildOutputDir: pagesTable.buildOutputDir,
      })
      .from(pagesTable);
    res.json(pagesList);
  } catch (error) {
    console.error("Error fetching pages list:", error);
    res.status(500).json({ error: "Failed to fetch pages list" });
  }
});

app.get("/pages/api/repositories", async (req, res) => {
  try {
    const accounts = await db
      .select({
        login: accountsTable.login,
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable);

    if (!accounts.length) {
      return res.json({ repositories: [] });
    }

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

    const accounts = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable);

    if (!accounts.length) {
      return res.status(404).json({ error: "No connected accounts found" });
    }

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
    const {
      selectedRepo,
      pageName,
      branch,
      buildScript,
      envVars,
      editPage,
      buildOutputDir,
    } = req.body;

    if (!pageName || !branch || !selectedRepo || !selectedRepo.full_name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let page;
    if (editPage) {
      [page] = await db
        .update(pagesTable)
        .set({
          name: pageName,
          branch,
          buildScript: buildScript || null,
          repo: selectedRepo.full_name,
          buildOutputDir: buildOutputDir || null, // Allow null
        })
        .where(eq(pagesTable.id, editPage.id))
        .returning({ id: pagesTable.id });
    } else {
      [page] = await db
        .insert(pagesTable)
        .values({
          repo: selectedRepo.full_name,
          name: pageName,
          branch,
          buildScript: buildScript || null,
          buildOutputDir: buildOutputDir || null, // Allow null
        })
        .returning({ id: pagesTable.id });
    }

    if (editPage) {
      await db.delete(envsTable).where(eq(envsTable.pageId, editPage.id));
    }

    if (Array.isArray(envVars)) {
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

    const [deployment] = await db
      .insert(deploymentsTable)
      .values({ pageId: page.id })
      .returning({ id: deploymentsTable.id });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fsPromises.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);
    console.log(`Creating log file: ${logFilePath}`);
    const initialLogText = "Deployment initialized. Logs will appear here.\n";
    await fsPromises.writeFile(logFilePath, initialLogText);

    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId: page.id, deploymentId: deployment.id },
    });

    worker.on("error", async (error) => {
      console.error(`Worker error: ${error.message}`);
      const logFilePath = path.join(
        process.env.PAGES_DIR,
        "deployments",
        `${deployment.id}.log`
      );
      await fsPromises.appendFile(
        logFilePath,
        `\n===DEPLOYMENT ERROR===\n${error.message}\n`
      );
    });

    worker.on("exit", async (code) => {
      console.log(`Worker exited with code ${code}`);
      const exitCode = code === 0 ? 0 : 1;
      try {
        await db
          .update(deploymentsTable)
          .set({ exitCode, completedAt: new Date().toISOString() })
          .where(eq(deploymentsTable.id, deployment.id));
        console.log(`Deployment ${deployment.id} updated successfully.`);

        const logFilePath = path.join(
          process.env.PAGES_DIR,
          "deployments",
          `${deployment.id}.log`
        );
        await fsPromises.appendFile(
          logFilePath,
          `\n===DEPLOYMENT COMPLETED===\n`
        );
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

app.post("/pages/api/save-page-details", async (req, res) => {
  try {
    const {
      selectedRepo,
      pageName,
      branch,
      buildScript,
      envVars,
      editPage,
      buildOutputDir,
    } = req.body;

    if (!pageName || !branch || !selectedRepo || !selectedRepo.full_name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (editPage) {
      await db
        .update(pagesTable)
        .set({
          name: pageName,
          branch,
          buildScript: buildScript || null,
          repo: selectedRepo.full_name,
          buildOutputDir: buildOutputDir || null,
        })
        .where(eq(pagesTable.id, editPage.id));

      await db.delete(envsTable).where(eq(envsTable.pageId, editPage.id));
    }

    if (Array.isArray(envVars)) {
      for (const env of envVars) {
        await db.insert(envsTable).values({
          pageId: editPage.id,
          name: env.name,
          value: env.value,
        });
      }
    }

    res.json({ message: "Page details saved successfully" });
  } catch (error) {
    console.error("Error saving page details:", error);
    res.status(500).json({ error: "Failed to save page details" });
  }
});

app.post("/pages/api/create-page", async (req, res) => {
  try {
    const {
      repo,
      name,
      branch,
      buildScript,
      envVars,
      accountLogin,
      buildOutputDir,
    } = req.body;

    if (!repo || !name || !branch || !accountLogin) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newPage] = await db
      .insert(pagesTable)
      .values({
        repo,
        name,
        branch,
        buildScript: buildScript || null,
        accountLogin,
        buildOutputDir: buildOutputDir || null, // Allow null
      })
      .returning({
        id: pagesTable.id,
        repo: pagesTable.repo,
        name: pagesTable.name,
        branch: pagesTable.branch,
        accountLogin: pagesTable.accountLogin,
        buildOutputDir: pagesTable.buildOutputDir,
      });

    if (Array.isArray(envVars)) {
      for (const env of envVars) {
        await db.insert(envsTable).values({
          pageId: newPage.id,
          name: env.name,
          value: env.value,
        });
      }
    }

    const [deployment] = await db
      .insert(deploymentsTable)
      .values({ pageId: newPage.id })
      .returning({ id: deploymentsTable.id });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fsPromises.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);
    const initialLogText = "Deployment initialized. Logs will appear here.\n";
    await fsPromises.writeFile(logFilePath, initialLogText);

    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId: newPage.id, deploymentId: deployment.id },
    });

    worker.on("error", async (error) => {
      console.error(`Worker error: ${error.message}`);
      await fsPromises.appendFile(
        logFilePath,
        `\n===DEPLOYMENT ERROR===\n${error.message}\n`
      );
    });

    worker.on("exit", async (code) => {
      console.log(`Worker exited with code ${code}`);
      const exitCode = code === 0 ? 0 : 1;
      try {
        await db
          .update(deploymentsTable)
          .set({ exitCode, completedAt: new Date().toISOString() })
          .where(eq(deploymentsTable.id, deployment.id));
        console.log(`Deployment ${deployment.id} updated successfully.`);

        await fsPromises.appendFile(
          logFilePath,
          `\n===DEPLOYMENT COMPLETED===\n`
        );
      } catch (error) {
        console.error(`Failed to update deployment ${deployment.id}:`, error);
      }
    });

    // Add webhook for the new page
    const [account] = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable)
      .where(eq(accountsTable.login, accountLogin));

    if (!account) {
      throw new Error("No associated account found for webhook setup.");
    }

    const webhookResponse = await fetch(
      `https://api.github.com/repos/${repo}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: `${process.env.HOST}/pages/github-webhook-callback`,
            content_type: "json",
            secret: GITHUB_WEBHOOK_SECRET,
          },
        }),
      }
    );

    if (!webhookResponse.ok) {
      const errorData = await webhookResponse.json();
      console.error("Error adding webhook:", errorData);
      throw new Error("Failed to add webhook");
    }

    res.status(201).json({ pageId: newPage.id, deploymentId: deployment.id });
  } catch (error) {
    console.error("Error creating new page:", error);
    res
      .status(500)
      .json({ error: "Failed to create new page", details: error.message });
  }
});

app.post("/pages/api/deploy", async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    const [deployment] = await db
      .insert(deploymentsTable)
      .values({ pageId })
      .returning({ id: deploymentsTable.id });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fsPromises.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);
    const initialLogText = "Deployment initialized. Logs will appear here.\n";
    await fsPromises.writeFile(logFilePath, initialLogText);

    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId, deploymentId: deployment.id },
    });

    worker.on("error", async (error) => {
      console.error(`Worker error: ${error.message}`);
      await fsPromises.appendFile(
        logFilePath,
        `\n===DEPLOYMENT ERROR===\n${error.message}\n`
      );
    });

    worker.on("exit", async (code) => {
      console.log(`Worker exited with code ${code}`);
      const exitCode = code === 0 ? 0 : 1;
      try {
        await db
          .update(deploymentsTable)
          .set({ exitCode, completedAt: new Date().toISOString() })
          .where(eq(deploymentsTable.id, deployment.id));
        console.log(`Deployment ${deployment.id} updated successfully.`);

        await fsPromises.appendFile(
          logFilePath,
          `\n===DEPLOYMENT COMPLETED===\n`
        );
      } catch (error) {
        console.error(`Failed to update deployment ${deployment.id}:`, error);
      }
    });

    res.json({
      message: "Deployment triggered successfully",
      deploymentId: deployment.id,
    });
  } catch (error) {
    console.error("Error during deployment:", error);
    res.status(500).json({ error: "Failed to deploy", details: error.message });
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
      .orderBy(desc(deploymentsTable.createdAt));

    res.json(deployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
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

    const logContent = await fsPromises.readFile(logFilePath, "utf-8");
    const isCompleted = logContent.includes("===DEPLOYMENT COMPLETED===");

    if (isCompleted) {
      console.log(`Deployment ${deploymentId} already completed.`);
      res.setHeader("Content-Type", "text/plain");
      res.write(logContent);
      return res.end();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const watcher = fs.watch(logFilePath, { encoding: "utf-8" }, async () => {
      try {
        const newContent = await fsPromises.readFile(logFilePath, "utf-8");
        res.write(newContent);

        if (newContent.includes("===DEPLOYMENT COMPLETED===")) {
          console.log(`End token detected for deployment ${deploymentId}`);
          watcher.close();
          res.end();
        }
      } catch (error) {
        console.error(
          `Error reading updated content for deployment ${deploymentId}:`,
          error
        );
      }
    });

    req.on("close", () => {
      console.log(
        `Client disconnected from log stream for deployment ${deploymentId}`
      );
      watcher.close();
    });
  } catch (error) {
    console.error(
      `Error streaming deployment log for deployment ${deploymentId}:`,
      error
    );
    res.status(500).end("Failed to stream deployment log");
  }
});

app.get("/pages/:pageId/deployments/:deploymentId", async (req, res) => {
  try {
    const { pageId, deploymentId } = req.params;

    if (!pageId || !deploymentId) {
      return res
        .status(400)
        .json({ error: "Missing pageId or deploymentId parameter" });
    }

    const deployment = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.pageId, pageId))
      .where(eq(deploymentsTable.id, deploymentId))
      .limit(1);

    if (deployment.length === 0) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    res.json(deployment[0]);
  } catch (error) {
    console.error("Error fetching deployment:", error);
    res.status(500).json({ error: "Failed to fetch deployment" });
  }
});

app.delete("/pages/api/pages/:id", async (req, res) => {
  try {
    const { id: pageId } = req.params;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Fetch the account associated with the page
    const [account] = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable)
      .where(eq(accountsTable.login, page.accountLogin));

    if (account) {
      // Fetch and delete all webhooks for the repository
      const hooksResponse = await fetch(
        `https://api.github.com/repos/${page.repo}/hooks`,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
          },
        }
      );

      if (hooksResponse.ok) {
        const hooks = await hooksResponse.json();
        const webhookPromises = hooks.map((hook) =>
          fetch(`https://api.github.com/repos/${page.repo}/hooks/${hook.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
            },
          })
        );
        await Promise.all(webhookPromises);
        console.log(`Deleted all webhooks for repository: ${page.repo}`);
      } else {
        console.error(
          `Failed to fetch webhooks for repository ${page.repo}:`,
          await hooksResponse.json()
        );
      }
    }

    const deletedPage = await db
      .delete(pagesTable)
      .where(eq(pagesTable.id, pageId))
      .returning({ id: pagesTable.id });

    if (deletedPage.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }

    const pageFolderPath = path.join(process.env.PAGES_DIR, "pages", pageId);
    try {
      await fsPromises.rm(pageFolderPath, { recursive: true, force: true });
      console.log(`Deleted folder: ${pageFolderPath}`);
    } catch (folderError) {
      console.error(`Failed to delete folder ${pageFolderPath}:`, folderError);
    }

    const serviceName = `webpilotx-${page.name}.service`;
    const userSystemdDir = path.join(process.env.HOME, ".config/systemd/user");
    const serviceFilePath = path.join(userSystemdDir, serviceName);

    try {
      await execPromise(`systemctl --user stop ${serviceName}`);
      await execPromise(`systemctl --user disable ${serviceName}`);
      console.log(`Service ${serviceName} stopped and disabled.`);

      await fsPromises.unlink(serviceFilePath);
      console.log(`Service file ${serviceFilePath} deleted.`);

      await execPromise("systemctl --user daemon-reload");
      console.log("Systemd reloaded after service removal.");
    } catch (error) {
      console.error(`Error purging service ${serviceName}:`, error);
    }

    res.status(200).json({
      message: "Page, folder, service, and webhooks deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
});

app.get("/pages/api/env-vars", async (req, res) => {
  try {
    const { pageId } = req.query;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const envVars = await db
      .select()
      .from(envsTable)
      .where(eq(envsTable.pageId, pageId));

    res.json(envVars);
  } catch (error) {
    console.error("Error fetching environment variables:", error);
    res.status(500).json({ error: "Failed to fetch environment variables" });
  }
});

app.get("/pages/api/github-webhook-status", async (req, res) => {
  try {
    const { pageId } = req.query;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    const [account] = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable)
      .where(eq(accountsTable.login, page.accountLogin));

    if (!account) {
      return res.status(404).json({ error: "No associated account found" });
    }

    const response = await fetch(
      `https://api.github.com/repos/${page.repo}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error fetching webhooks:", errorData);
      return res
        .status(500)
        .json({ error: "Failed to fetch webhooks", details: errorData });
    }

    const hooks = await response.json();
    const webhookExists = hooks.some((hook) =>
      hook.config.url.includes(
        `${process.env.HOST}/pages/github-webhook-callback`
      )
    );

    res.json({ webhookExists });
  } catch (error) {
    console.error("Error checking webhook status:", error);
    res.status(500).json({ error: "Failed to check webhook status" });
  }
});

async function triggerDeployment(pageId) {
  try {
    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      throw new Error("Page not found");
    }

    const [deployment] = await db
      .insert(deploymentsTable)
      .values({ pageId })
      .returning({ id: deploymentsTable.id });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fsPromises.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);
    const initialLogText = "Deployment initialized. Logs will appear here.\n";
    await fsPromises.writeFile(logFilePath, initialLogText);

    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: { pageId, deploymentId: deployment.id },
    });

    worker.on("error", async (error) => {
      console.error(`Worker error: ${error.message}`);
      await fsPromises.appendFile(
        logFilePath,
        `\n===DEPLOYMENT ERROR===\n${error.message}\n`
      );
    });

    worker.on("exit", async (code) => {
      console.log(`Worker exited with code ${code}`);
      const exitCode = code === 0 ? 0 : 1;
      try {
        await db
          .update(deploymentsTable)
          .set({ exitCode, completedAt: new Date().toISOString() })
          .where(eq(deploymentsTable.id, deployment.id));
        console.log(`Deployment ${deployment.id} updated successfully.`);

        await fsPromises.appendFile(
          logFilePath,
          `\n===DEPLOYMENT COMPLETED===\n`
        );
      } catch (error) {
        console.error(`Failed to update deployment ${deployment.id}:`, error);
      }
    });

    console.log(`Deployment triggered successfully for page ${pageId}`);
  } catch (error) {
    console.error(`Error triggering deployment for page ${pageId}:`, error);
    throw error;
  }
}

app.post("/pages/github-webhook-callback", async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"];
    const payload = req.rawBody;

    const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log(`Received GitHub event: ${event}`);
    if (event === "push") {
      const { repository, ref } = JSON.parse(payload);
      const repoFullName = repository.full_name;

      const pages = await db
        .select()
        .from(pagesTable)
        .where(
          and(
            eq(pagesTable.repo, repoFullName),
            eq(pagesTable.branch, ref.split("/").pop())
          )
        );

      if (pages.length === 0) {
        console.error("No pages found for the repository and branch");
        return res.status(404).json({ error: "No pages found" });
      }

      await Promise.all(
        pages.map(async (page) => {
          try {
            await triggerDeployment(page.id);
          } catch (error) {
            console.error(
              `Error triggering deployment for page ${page.id}:`,
              error
            );
          }
        })
      );

      res.status(200).json({ message: "Webhook processed successfully" });
    } else {
      console.log(`Unhandled GitHub event: ${event}`);
      return res.status(200).json({ message: `Event ${event} ignored` });
    }
  } catch (error) {
    console.error("Error processing GitHub webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

app.post("/pages/api/github-webhook", async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    const [account] = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable)
      .where(eq(accountsTable.login, page.accountLogin));

    const response = await fetch(
      `https://api.github.com/repos/${page.repo}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: `${process.env.HOST}/pages/github-webhook-callback`,
            content_type: "json",
            secret: GITHUB_WEBHOOK_SECRET,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error adding webhook:", errorData);
      return res
        .status(500)
        .json({ error: "Failed to add webhook", details: errorData });
    }

    res.json({ message: "Webhook added successfully" });
  } catch (error) {
    console.error("Error adding webhook:", error);
    res.status(500).json({ error: "Failed to add webhook" });
  }
});

app.delete("/pages/api/github-webhook", async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({ error: "Missing pageId parameter" });
    }

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    const [account] = await db
      .select({
        accessToken: accountsTable.accessToken,
      })
      .from(accountsTable)
      .where(eq(accountsTable.login, page.accountLogin));

    if (!account) {
      return res.status(404).json({ error: "No associated account found" });
    }

    const hooksResponse = await fetch(
      `https://api.github.com/repos/${page.repo}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      }
    );

    if (!hooksResponse.ok) {
      const errorData = await hooksResponse.json();
      console.error("Error fetching webhooks:", errorData);
      return res
        .status(500)
        .json({ error: "Failed to fetch webhooks", details: errorData });
    }

    const hooks = await hooksResponse.json();
    const webhook = hooks.find((hook) =>
      hook.config.url.includes(
        `${process.env.HOST}/pages/github-webhook-callback`
      )
    );

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${page.repo}/hooks/${webhook.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error("Error deleting webhook:", errorData);
      return res
        .status(500)
        .json({ error: "Failed to delete webhook", details: errorData });
    }

    res.json({ message: "Webhook removed successfully" });
  } catch (error) {
    console.error("Error removing webhook:", error);
    res.status(500).json({ error: "Failed to remove webhook" });
  }
});

export default app;
