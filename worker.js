import { exec, spawn } from "child_process";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { workerData } from "worker_threads";
import { envsTable, pagesTable } from "./schema.js";
import os from "os";

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
  const { pageId, deploymentId } = workerData;

  console.log(
    `Worker started for page ID: ${pageId}, deployment ID: ${deploymentId}`
  );

  const logFilePath = path.join(
    process.env.PAGES_DIR,
    "deployments",
    `${deploymentId}.log`
  );

  const [page] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));
  if (!page) {
    await fs.appendFile(
      logFilePath,
      `\n===DEPLOYMENT ERROR===\nPage with ID ${pageId} not found\n`
    );
    process.exit(1);
  }

  const envVars = await db
    .select()
    .from(envsTable)
    .where(eq(envsTable.pageId, pageId));

  const cloneDir = path.join(process.env.PAGES_DIR, "pages", String(pageId));
  await fs.mkdir(cloneDir, { recursive: true });

  const repoExists = await fs
    .access(path.join(cloneDir, ".git"))
    .then(() => true)
    .catch(() => false);

  if (repoExists) {
    const pullCommand = `cd ${cloneDir} && git pull origin ${page.branch}`;
    await execPromise(pullCommand);
  } else {
    const cloneCommand = `git clone --branch ${page.branch} https://github.com/${page.repo}.git ${cloneDir}`;
    await execPromise(cloneCommand);
  }

  const envFileContent = envVars
    .map((env) => `${env.name}=${env.value}`)
    .join("\n");
  await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

  let exitCode = 0;

  if (page.buildScript) {
    // Create a temporary directory for the build script
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-"));
    const buildScriptPath = path.join(tempDir, "build.sh");
    const buildScriptContent = `
      #!/usr/bin/bash
      ${page.buildScript}
    `;
    await fs.writeFile(buildScriptPath, buildScriptContent, { mode: 0o755 });

    // Execute the .sh file using spawn
    const buildCommand = spawn("bash", [buildScriptPath]);
    const logStream = await fs.open(logFilePath, "a");

    buildCommand.stdout.on("data", (data) => {
      logStream.write(data);
    });

    buildCommand.stderr.on("data", (data) => {
      logStream.write(data);
    });

    await new Promise((resolve) => {
      buildCommand.on("close", (code) => {
        exitCode = code;
        resolve();
      });
    });

    await logStream.close();

    // Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  if (exitCode === 0) {
    const serviceName = `webpilotx-pages-${page.name}.service`;
    const nodeBinary = process.execPath;
    const envVarsString = envVars
      .map((env) => `Environment="${env.name}=${env.value}"`)
      .join("\n");

    const serviceContent = `
[Unit]
Description=Service for ${page.name}
After=network.target

[Service]
WorkingDirectory=${cloneDir}
ExecStart=${nodeBinary} index.js
Restart=always
${envVarsString}

[Install]
WantedBy=default.target
    `;

    const userSystemdDir = path.join(process.env.HOME, ".config/systemd/user");
    const serviceFilePath = path.join(userSystemdDir, serviceName);

    await fs.mkdir(userSystemdDir, { recursive: true });
    await fs.writeFile(serviceFilePath, serviceContent, { mode: 0o644 });

    await execPromise("systemctl --user daemon-reload");
    await execPromise(`systemctl --user enable ${serviceName}`);
    await execPromise(`systemctl --user start ${serviceName}`);
  }

  process.exit(exitCode);
})();
