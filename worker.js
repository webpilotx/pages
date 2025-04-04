import { exec } from "child_process";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { parentPort, workerData } from "worker_threads";

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

const sendToMainThread = (action, data) =>
  new Promise((resolve, reject) => {
    parentPort.once("message", (response) => {
      if (response.success) {
        resolve(response.result);
      } else {
        reject(new Error(response.error));
      }
    });
    parentPort.postMessage({ action, data });
  });

(async () => {
  try {
    const { pageId } = workerData;

    // Fetch page details
    const page = await sendToMainThread("fetchPageDetails", { pageId });
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    // Fetch environment variables
    const envVars = await sendToMainThread("fetchEnvVars", { pageId });

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
      parentPort.postMessage(`Pulling latest changes: ${pullCommand}`);
      await execPromise(pullCommand);
    } else {
      // Clone the repository if it doesn't exist
      const cloneCommand = `git clone --branch ${page.branch} https://github.com/${page.repo}.git ${cloneDir}`;
      parentPort.postMessage(`Cloning repository: ${cloneCommand}`);
      await execPromise(cloneCommand);
    }

    // Dump environment variables to .env file
    const envFileContent = envVars
      .map((env) => `${env.name}=${env.value}`)
      .join("\n");
    await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

    // Insert a new deployment record
    const deployment = await sendToMainThread("insertDeployment", {
      pageId: page.id,
    });

    const logDir = path.join(process.env.PAGES_DIR, "deployments");
    await fs.mkdir(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `${deployment.id}.log`);

    let buildOutput = "No build script provided.";
    let exitCode = 0;

    if (page.buildScript) {
      const buildCommand = `cd ${cloneDir} && ${page.buildScript}`;
      parentPort.postMessage(`Running build script: ${buildCommand}`);
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
    await sendToMainThread("updateDeployment", {
      deploymentId: deployment.id,
      values: { exitCode, completedAt: new Date().toISOString() },
    });

    parentPort.postMessage(
      `Deployment for page ID ${pageId} completed with exit code ${exitCode}.`
    );
  } catch (error) {
    parentPort.postMessage(`Error during deployment: ${error.message}`);
  }
})();
