import { drizzle } from "drizzle-orm/libsql";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

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
      .from("pages_table")
      .where(eq("id", pageId));

    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    // Fetch environment variables
    const envVars = await db
      .select()
      .from("envs_table")
      .where(eq("pageId", pageId));

    // Clone the repository
    const cloneDir = path.join(process.env.PAGES_DIR, String(pageId));
    await fs.mkdir(cloneDir, { recursive: true });

    const cloneCommand = `git clone --branch ${page.branch} https://github.com/${page.repo}.git ${cloneDir}`;
    console.log(`Cloning repository: ${cloneCommand}`);
    await execPromise(cloneCommand);

    // Dump environment variables to .env file
    const envFileContent = envVars
      .map((env) => `${env.name}=${env.value}`)
      .join("\n");
    await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

    // Insert a new deployment record
    const [deployment] = await db
      .insert("deployments_table")
      .values({
        pageId: page.id,
        status: "in_progress",
      })
      .returning({ id: "id" });

    const logDir = path.join(process.env.PAGES_DIR, "logs");
    await fs.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);

    let buildOutput = "No build script provided.";
    if (page.buildScript) {
      const buildCommand = `cd ${cloneDir} && ${page.buildScript}`;
      console.log(`Running build script: ${buildCommand}`);
      buildOutput = await execPromise(buildCommand);
    }

    // Write the output to the log file
    await fs.writeFile(logFilePath, buildOutput);

    // Update the deployment status to success
    await db
      .update("deployments_table")
      .set({ status: "success" })
      .where(eq("id", deployment.id));

    console.log(`Deployment for page ID ${pageId} completed successfully.`);
  } catch (error) {
    console.error("Error during deployment:", error);

    // Insert a new deployment record if it doesn't exist
    const deploymentId = process.argv[2];
    const logDir = path.join(process.env.PAGES_DIR, "logs");
    await fs.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deploymentId}.log`);

    // Write the error to the log file
    await fs.writeFile(logFilePath, error.message);

    // Update the deployment status to failure
    await db
      .update("deployments_table")
      .set({ status: "failure" })
      .where(eq("id", deploymentId));
  }
})();
