import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const distRoot = path.join(root, "dist-app");

async function run(cmd, args) {
  await execFileAsync(cmd, args, { cwd: root, stdio: "inherit" });
}

async function build() {
  await rm(distRoot, { recursive: true, force: true });
  await mkdir(distRoot, { recursive: true });

  await run("npm", ["run", "build:ts"]);

  const copyJobs = [
    ["index.html", "index.html"],
    ["privacy-policy.html", "privacy-policy.html"],
    ["terms-of-service.html", "terms-of-service.html"],
    ["favicon.svg", "favicon.svg"],
    ["favicon.ico", "favicon.ico"],
    ["images", "images"],
    ["assets", "assets"],
    ["dist", "dist"],
    ["manifest.webmanifest", "manifest.webmanifest"],
    ["public/json", "json"],
    ["sw.js", "sw.js"],
  ];

  for (const [src, dest] of copyJobs) {
    await cp(path.join(root, src), path.join(distRoot, dest), { recursive: true });
  }

  console.log(`[build] Frontend packaged to ${distRoot}`);
}

build().catch((err) => {
  console.error("[build] failed", err);
  process.exitCode = 1;
});
