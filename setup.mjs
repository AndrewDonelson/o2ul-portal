// file: setup.mjs
import fs from "fs";
import { config as loadEnvFile } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { platform } from "os";
import { createInterface } from 'readline';
import crypto from 'crypto';
import webPush from 'web-push';

const GIT_CONFIG_COMMANDS = [
    'git config core.autocrlf false',
    'git config core.eol lf'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG = false;

function debugLog(message, data = null) {
    if (DEBUG) {
        console.log('\n[DEBUG] ' + message);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

function execCommand(command, silent = false) {
    try {
        return execSync(command, {
            stdio: silent ? 'ignore' : 'inherit',
            shell: true,
            env: { ...process.env, FORCE_COLOR: true }
        });
    } catch (error) {
        debugLog(`Error executing command: ${command}`, error);
        throw error;
    }
}

function isGitRepo() {
    try {
        execCommand('git rev-parse --is-inside-work-tree', true);
        return true;
    } catch {
        return false;
    }
}

function initGitAndCommit() {
    try {
        if (!isGitRepo()) {
            console.log("Initializing Git repository...");
            execCommand('git init');
            GIT_CONFIG_COMMANDS.forEach(cmd => execCommand(cmd));
        }

        const gitattributesPath = path.join(process.cwd(), '.gitattributes');
        if (!fs.existsSync(gitattributesPath)) {
            const gitattributes = `
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
            `.trim();
            fs.writeFileSync(gitattributesPath, gitattributes);
            execCommand('git add .gitattributes');
        }

        const status = execSync('git status --porcelain').toString();
        if (status) {
            console.log("Making initial commit...");
            execCommand('git add .');
            execCommand('git commit -m "chore: initial project setup with NextJS & Convex\n\n- NextJS 14 app router setup\n- Convex integration\n- TailwindCSS configuration\n- ShadCN/UI components\n- TypeScript configuration\n- Base project structure"');
            console.log("Initial commit completed successfully!");
        }
    } catch (error) {
        console.error("Failed to initialize Git:", error);
        throw error;
    }
}

function createRL() {
    return createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

async function question(rl, query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function loadEnvVars() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return {};

    const config = {};
    loadEnvFile({ path: envPath, processEnv: config });
    return config;
}

function generateVapidKeys() {
    try {
        const vapidKeys = webPush.generateVAPIDKeys();
        return {
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey
        };
    } catch (error) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'P-256',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        return {
            publicKey: Buffer.from(publicKey)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, ''),
            privateKey: Buffer.from(privateKey)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
        };
    }
}

async function collectGeneralSettings(rl) {
    const currentVars = await loadEnvVars();
    const settings = {};

    console.log("\n=== General App Settings ===");

    const prompts = {
        NEXT_PUBLIC_APP_NAME: "Enter your app name",
        NEXT_PUBLIC_APP_SHORT_NAME: "Enter your app short name",
        NEXT_PUBLIC_APP_DESCRIPTION: "Enter your app description",
        NEXT_PUBLIC_PUBLISHER_NAME: "Enter publisher name",
        NEXT_PUBLIC_PUBLISHER_URL: "Enter publisher URL",
        NEXT_PUBLIC_COPYRIGHT_FROM_YEAR: "Enter copyright start year"
    };

    for (const [key, prompt] of Object.entries(prompts)) {
        const defaultValue = currentVars[key] || '';
        const defaultDisplay = defaultValue ? ` (${defaultValue})` : '';
        const response = await question(rl, `${prompt}${defaultDisplay}: `);
        settings[key] = response || defaultValue || (key === 'NEXT_PUBLIC_COPYRIGHT_FROM_YEAR' ? new Date().getFullYear().toString() : '');
    }

    return settings;
}

function generateWebPushSettings() {
    console.log("\n=== Generating Web Push Settings ===");
    const vapidKeys = generateVapidKeys();

    return {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapidKeys.publicKey,
        VAPID_PRIVATE_KEY: vapidKeys.privateKey
    };
}

async function updateEnvFile(settings) {
    const envPath = path.join(process.cwd(), ".env.local");
    const currentVars = await loadEnvVars();

    const combinedSettings = {
        ...currentVars,
        ...settings.general,
        ...settings.webPush
    };

    const groups = {
        'General app settings': Object.entries(settings.general),
        'Web Push API keys': Object.entries(settings.webPush),
        'Other settings': Object.entries(currentVars).filter(([key]) =>
            !Object.keys(settings.general).includes(key) &&
            !Object.keys(settings.webPush).includes(key))
    };

    let envContent = '';
    for (const [groupName, entries] of Object.entries(groups)) {
        if (entries.length) {
            envContent += `\n# ${groupName}\n`;
            envContent += entries.map(([key, value]) => `${key}=${value}`).join('\n');
            envContent += '\n';
        }
    }

    await fs.promises.writeFile(envPath, envContent.trim());
}

async function setupEnvironmentVariables() {
    const rl = createRL();

    try {
        const generalSettings = await collectGeneralSettings(rl);
        const webPushSettings = generateWebPushSettings();

        await updateEnvFile({
            general: generalSettings,
            webPush: webPushSettings
        });

        console.log("\nEnvironment variables have been successfully updated!");
    } catch (error) {
        console.error("Error setting up environment variables:", error);
        throw error;
    } finally {
        rl.close();
    }
}

async function runSetup() {
    try {
        initGitAndCommit();

        const envPath = path.join(process.cwd(), ".env.local");
        debugLog(`Checking for .env.local at: ${envPath}`);

        const config = await loadEnvVars();
        const setupAlreadyRan = config.SETUP_SCRIPT_RAN === 'true';

        if (!fs.existsSync(envPath)) {
            console.log("Creating .env.local file...");
            await fs.promises.writeFile(envPath, '');
            await setupEnvironmentVariables();
        } else if (!setupAlreadyRan) {
            await setupEnvironmentVariables();
        } else {
            console.log("Setup already ran. Skipping environment configuration.");
        }

        debugLog("Loaded environment variables", config);

        const runOnceWorkflow = process.argv.includes("--once");
        if (runOnceWorkflow && setupAlreadyRan) {
            debugLog("Setup script has already run. Exiting early.");
            console.log("Setup script has already run. Skipping.");
            process.exit(0);
        }

        const deploymentName = config.CONVEX_DEPLOYMENT?.split(":").slice(-1)[0] ?? "<your deployment name>";
        debugLog(`Deployment name: ${deploymentName}`);

        const variablesObj = {
            help: "This template includes prebuilt sign-in via GitHub OAuth and magic links via Resend.",
            providers: [
                {
                    name: "GitHub OAuth",
                    help: `Create a GitHub OAuth App using:\nhttps://${deploymentName}.convex.site/api/auth/callback/github`,
                    variables: [
                        { name: "AUTH_GITHUB_ID", description: "GitHub OAuth App Client ID" },
                        { name: "AUTH_GITHUB_SECRET", description: "GitHub OAuth App Client Secret" }
                    ]
                },
                {
                    name: "Resend",
                    help: "Sign up at https://resend.com/signup",
                    variables: [
                        { name: "AUTH_RESEND_KEY", description: "Resend API Key" }
                    ]
                }
            ],
            success: "Setup complete! Rerun with 'node setup.mjs' if needed."
        };

        const variables = JSON.stringify(variablesObj)
            .replace(/"/g, '\\"')
            .replace(/`/g, "'");

        debugLog("Variables configuration", variables);

        console.log("\nConfiguring Convex Auth...");

        const isWindows = platform() === "win32";
        const npmCmd = isWindows ? 'npx.cmd' : 'npx';
        execCommand(`${npmCmd} @convex-dev/auth --variables "${variables}" --skip-git-check`);

        if (runOnceWorkflow && !setupAlreadyRan) {
            await fs.promises.appendFile(envPath, `\nSETUP_SCRIPT_RAN=true\n`);
        }

        const status = execSync('git status --porcelain').toString();
        if (status) {
            console.log("\nCommitting changes...");
            execCommand('git add .');
            execCommand('git commit -m "feat: configure application\n\n- Set up environment variables\n- Configure authentication\n- Initialize Web Push\n- Complete configuration"');
        }

        console.log("\nSetup completed successfully!");

    } catch (error) {
        debugLog("Setup failed", error);
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

console.log("Starting setup script...");
runSetup().catch(error => {
    debugLog("Unhandled error", error);
    console.error('Setup failed:', error);
    process.exit(1);
});