import { exec } from "child_process";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import fs from "fs/promises";
import path from "path";
import { deploymentsTable, envsTable, pagesTable } from "./schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DB_FILE_NAME);

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

(async () => {
  try {
    const pageId = process.argv[2];
    if (!pageId) {
      throw new Error("Page ID is required");
    }

    // Fetch page details
    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    // Fetch environment variables
    const envVars = await db
      .select()
      .from(envsTable)
      .where(eq(envsTable.pageId, pageId));

    // Determine the repository directory
    const cloneDir = path.join(process.env.PAGES_DIR, String(pageId));
    await fs.mkdir(cloneDir, { recursive: true });

    // Check if the repository already exists
    const repoExists = await fs
      .access(path.join(cloneDir, ".git"))
      .then(() => true)
      .catch(() => false);

    if (repoExists) {
      // Run git pull if the repository already exists
      const pullCommand = `cd ${cloneDir} && git pull origin ${page.branch}`;
      console.log(`Pulling latest changes: ${pullCommand}`);
      await execPromise(pullCommand);
    } else {
      // Clone the repository if it doesn't exist
      const cloneCommand = `git clone --branch ${page.branch} https://github.com/${page.repo}.git ${cloneDir}`;
      console.log(`Cloning repository: ${cloneCommand}`);
      await execPromise(cloneCommand);
    }

    // Dump environment variables to .env file
    const envFileContent = envVars
      .map((env) => `${env.name}=${env.value}`)
      .join("\n");
    await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

    // Insert a new deployment record
    const [deployment] = await db
      .insert(deploymentsTable)
      .values({
        pageId: page.id,
      })
      .returning({ id: deploymentsTable.id });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fs.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);

    let buildOutput = "No build script provided.";
    let exitCode = 0;

    if (page.buildScript) {
      const buildCommand = `cd ${cloneDir} && ${page.buildScript}`;
      console.log(`Running build script: ${buildCommand}`);
      try {
        buildOutput = await execPromise(buildCommand);
      } catch (error) {
        buildOutput = error.message;
        exitCode = 1; // Non-zero exit code indicates failure
      }
    }

    // Write the output to the log file
    await fs.writeFile(logFilePath, buildOutput);

    // Update the deployment status with the exit code
    await db
      .update(deploymentsTable)
      .set({ exitCode, completedAt: new Date().toISOString() })
      .where(eq(deploymentsTable.id, deployment.id));

    console.log(
      `Deployment for page ID ${pageId} completed with exit code ${exitCode}.`
    );
  } catch (error) {
    console.error("Error during deployment:", error);

    const deploymentId = process.argv[2];
    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fs.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deploymentId}.log`);

    // Write the error to the log file
    await fs.writeFile(logFilePath, error.message);

    // Update the deployment status to failure with exit code 1
    await db
      .update(deploymentsTable)
      .set({ exitCode: 1, completedAt: new Date().toISOString() })
      .where(eq(deploymentsTable.id, deploymentId));
  }
})();
