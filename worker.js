import { exec } from "child_process";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { workerData } from "worker_threads";
import { envsTable, pagesTable } from "./schema.js";

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
    const { pageId, deploymentId } = workerData;

    console.log(
      `Worker started for page ID: ${pageId}, deployment ID: ${deploymentId}`
    );

    // Fetch page details
    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }
    console.log(`Fetched page details: ${JSON.stringify(page, null, 2)}`);

    // Fetch environment variables
    const envVars = await db
      .select()
      .from(envsTable)
      .where(eq(envsTable.pageId, pageId));
    console.log(
      `Fetched environment variables: ${JSON.stringify(envVars, null, 2)}`
    );

    // Determine the repository directory
    const cloneDir = path.join(process.env.PAGES_DIR, String(pageId));
    console.log(`Repository directory: ${cloneDir}`);
    await fs.mkdir(cloneDir, { recursive: true });

    // Check if the repository already exists
    const repoExists = await fs
      .access(path.join(cloneDir, ".git"))
      .then(() => true)
      .catch(() => false);

    if (repoExists) {
      console.log(`Repository exists. Pulling latest changes.`);
      const pullCommand = `cd ${cloneDir} && git pull origin ${page.branch}`;
      await execPromise(pullCommand);
    } else {
      console.log(`Repository does not exist. Cloning repository.`);
      const cloneCommand = `git clone --branch ${page.branch} https://github.com/${page.repo}.git ${cloneDir}`;
      await execPromise(cloneCommand);
    }

    // Dump environment variables to .env file
    console.log(`Writing environment variables to .env file.`);
    const envFileContent = envVars
      .map((env) => `${env.name}=${env.value}`)
      .join("\n");
    await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

    let exitCode = 0;

    if (page.buildScript) {
      console.log(`Running build script: ${page.buildScript}`);
      const buildCommand = `cd ${cloneDir} && ${page.buildScript}`;
      const logDir = path.join(process.env.PAGES_DIR, "deployments");
      const logFilePath = path.join(logDir, `${deploymentId}.log`);

      try {
        const logStream = await fs.open(logFilePath, "a"); // Open log file in append mode
        const childProcess = exec(buildCommand, { shell: true });

        childProcess.stdout.pipe(logStream.createWriteStream());
        childProcess.stderr.pipe(logStream.createWriteStream());

        await new Promise((resolve, reject) => {
          childProcess.on("close", (code) => {
            exitCode = code;
            resolve();
          });
          childProcess.on("error", (error) => {
            reject(error);
          });
        });

        // Write an end token to the log file
        await logStream.write("\n===BUILD SCRIPT COMPLETED===\n");
        await logStream.close(); // Close the log file stream
      } catch (error) {
        console.error(`Error running build script: ${error.message}`);
        exitCode = 1; // Non-zero exit code indicates failure
      }
    } else {
      console.log("No build script provided.");
    }

    process.exit(exitCode); // Exit with the appropriate code
  } catch (error) {
    console.error(`Error during deployment: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
})();
