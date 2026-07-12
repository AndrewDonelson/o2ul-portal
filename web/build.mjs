import { cp, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const distRoot = path.join(root, "dist-app");
const embeddedRoot = path.resolve(root, "../internal/webui/distapp");

async function run(cmd, args) {
  await execFileAsync(cmd, args, { cwd: root, stdio: "inherit" });
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function hashDirectory(directory) {
  const files = [];

  async function walk(current) {
    const entries = await import("node:fs/promises").then(({ readdir }) => readdir(current, { withFileTypes: true }));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  await walk(directory);
  files.sort();

  const hash = createHash("sha256");
  for (const file of files) {
    const relative = normalizePath(path.relative(directory, file));
    const contents = await import("node:fs/promises").then(({ readFile }) => readFile(file));
    hash.update(relative);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }

  return hash.digest("hex");
}

async function build() {
  await rm(distRoot, { recursive: true, force: true });
  await rm(embeddedRoot, { recursive: true, force: true });
  await mkdir(distRoot, { recursive: true });
  await mkdir(embeddedRoot, { recursive: true });

  await run("npm", ["run", "build:ts"]);

  const copyJobs = [
    ["index.html", "index.html"],
    ["privacy-policy.html", "privacy-policy.html"],
    ["terms-of-service.html", "terms-of-service.html"],
    ["favicon.svg", "favicon.svg"],
    ["favicon.ico", "favicon.ico"],
    ["images", "images"],
    ["assets", "assets"],
    ["modules", "modules"],
    ["dist", "dist"],
    ["manifest.webmanifest", "manifest.webmanifest"],
    ["public/json", "json"],
    ["sw.js", "sw.js"],
  ];

  for (const [src, dest] of copyJobs) {
    await cp(path.join(root, src), path.join(distRoot, dest), { recursive: true });
  }

  await cp(distRoot, embeddedRoot, { recursive: true });

  const buildHash = await hashDirectory(distRoot);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(
    path.join(embeddedRoot, "meta.json"),
    JSON.stringify({
      buildHash,
      source: "public/dist-app",
      generatedAt: new Date().toISOString(),
    }, null, 2) + "\n",
  ));

  console.log(`[build] Frontend packaged to ${distRoot}`);
}

build().catch((err) => {
  console.error("[build] failed", err);
  process.exitCode = 1;
});
