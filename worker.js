import { exec } from "child_process";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import fs from "fs/promises";
import path from "path";
import { workerData } from "worker_threads";
import { accountsTable, envsTable, pagesTable } from "./schema.js";

const db = drizzle(process.env.DATABASE_URL);

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

  const [account] = await db
    .select({
      accessToken: accountsTable.accessToken,
    })
    .from(accountsTable)
    .where(eq(accountsTable.login, page.accountLogin));

  if (!account) {
    await fs.appendFile(
      logFilePath,
      `\n===DEPLOYMENT ERROR===\nNo associated account found for page\n`
    );
    process.exit(1);
  }

  const authRepoUrl = `https://${account.accessToken}@github.com/${page.repo}.git`;

  const cloneDir = path.join(process.env.PAGES_DIR, "pages", String(pageId));
  await fs.mkdir(cloneDir, { recursive: true });

  const repoExists = await fs
    .access(path.join(cloneDir, ".git"))
    .then(() => true)
    .catch(() => false);

  if (repoExists) {
    const pullCommand = `cd ${cloneDir} && git pull origin ${page.branch}`;
    await fs.appendFile(
      logFilePath,
      `\n===GIT PULL===\nExecuting: git pull origin ${page.branch}\n` // Avoid logging sensitive data
    );
    await execPromise(pullCommand);
  } else {
    const cloneCommand = `git clone --branch ${page.branch} ${authRepoUrl} ${cloneDir}`;
    await fs.appendFile(
      logFilePath,
      `\n===GIT CLONE===\nExecuting: git clone --branch ${page.branch} [REDACTED_URL] ${cloneDir}\n` // Redact sensitive data
    );
    await execPromise(cloneCommand);
  }

  const envFileContent = envVars
    .map((env) => `${env.name}="${env.value}"`) // Encapsulate each value in double quotes
    .join("\n");

  await fs.appendFile(
    logFilePath,
    `\n===WRITING ENV FILE===\nWriting .env file to ${cloneDir}\n`
  );
  await fs.writeFile(path.join(cloneDir, ".env"), envFileContent);

  let exitCode = 0;

  if (page.buildScript) {
    const buildCommand = `
      cd ${cloneDir}
      ${page.buildScript}
    `;
    await fs.appendFile(
      logFilePath,
      `\n===BUILD SCRIPT===\nExecuting: ${buildCommand}\n`
    );
    const logStream = await fs.open(logFilePath, "a");

    await new Promise((resolve, reject) => {
      const childProcess = exec(buildCommand, { shell: true });

      childProcess.stdout.on("data", (data) => {
        logStream.write(data);
      });

      childProcess.stderr.on("data", (data) => {
        logStream.write(data);
      });

      childProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build script exited with code ${code}`));
        }
      });
    });

    await logStream.close();
  }

  if (exitCode === 0) {
    const serviceName = `webpilotx-${page.name}.service`;
    const nodeBinary = process.execPath;
    const execStartPath = page.buildOutputDir
      ? path.join(page.buildOutputDir, "index.js")
      : path.join("index.js");

    const envVarsString = envVars
      .map((env) => `Environment="${env.name}=${env.value}"`)
      .join("\n");

    const serviceContent = `
[Unit]
Description=Service for ${page.name}
After=network.target

[Service]
WorkingDirectory=${cloneDir}
ExecStart=${nodeBinary} ${execStartPath}
Restart=always
${envVarsString}

[Install]
WantedBy=default.target
    `;

    const userSystemdDir = path.join(process.env.HOME, ".config/systemd/user");
    const serviceFilePath = path.join(userSystemdDir, serviceName);

    await fs.appendFile(
      logFilePath,
      `\n===CREATING SYSTEMD SERVICE===\nService file path: ${serviceFilePath}\n`
    );
    await fs.writeFile(serviceFilePath, serviceContent, { mode: 0o644 });

    await fs.appendFile(
      logFilePath,
      `\n===SYSTEMD RELOAD===\nReloading systemd daemon\n`
    );
    await execPromise("systemctl --user daemon-reload");

    await fs.appendFile(
      logFilePath,
      `\n===SYSTEMD ENABLE===\nEnabling service: ${serviceName}\n`
    );
    await execPromise(`systemctl --user enable ${serviceName}`);

    await fs.appendFile(
      logFilePath,
      `\n===SYSTEMD RESTART===\nRestarting service: ${serviceName}\n`
    );
    await execPromise(`systemctl --user restart ${serviceName}`);
  }

  process.exit(exitCode);
})();
