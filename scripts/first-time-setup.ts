#!/usr/bin/env bun

import { resolve } from "path";
import { existsSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { confirm, input, select } from "@inquirer/prompts";
import kleur from "kleur";

const ENV_PATH = resolve(process.cwd(), ".env");
const ENV_EXAMPLE_PATH = resolve(process.cwd(), ".env.example");

interface SetupConfig {
  providers: {
    groq?: string;
    openrouter?: string;
    ollama?: boolean;
    lmstudio?: boolean;
  };
  encryption_key?: string;
  skip: boolean;
}

/**
 * Generate a secure 64-character hex key for AES-256-GCM encryption
 */
function generateEncryptionKey(): string {
  const bytes = new Uint8Array(32); // 32 bytes = 256 bits
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Validate Groq API key format
 */
function validateGroqKey(key: string): boolean | string {
  if (!key) return true; // Allow empty (skip)
  if (!key.startsWith("gsk_")) return 'Groq API keys must start with "gsk_"';
  if (key.length < 50) return "Groq API key appears too short";
  return true;
}

/**
 * Validate OpenRouter API key format
 */
function validateOpenRouterKey(key: string): boolean | string {
  if (!key) return true; // Allow empty (skip)
  if (!key.startsWith("sk-or-"))
    return 'OpenRouter API keys must start with "sk-or-"';
  if (key.length < 50) return "OpenRouter API key appears too short";
  return true;
}

/**
 * Interactive first-time setup wizard
 * Guides users through API key configuration
 */
export async function firstTimeSetup(): Promise<SetupConfig> {
  const config: SetupConfig = {
    providers: {},
    skip: false,
  };

  console.log(
    kleur.bold().magenta("\n🧿 Third Eye MCP - First-Time Setup Wizard\n"),
  );
  console.log(kleur.gray("━".repeat(60)));
  console.log(
    kleur.white("Let's configure your AI providers to get started.\n"),
  );

  // Check if .env already exists
  if (existsSync(ENV_PATH)) {
    const proceed = await confirm({
      message: ".env file already exists. Reconfigure providers?",
      default: false,
    });

    if (!proceed) {
      console.log(kleur.gray("\n   Skipping setup - using existing .env"));
      config.skip = true;
      return config;
    }
  }

  // Provider selection
  console.log(kleur.cyan("\n📡 Provider Configuration\n"));
  console.log("Third Eye MCP supports multiple AI providers:");
  console.log("  • Groq       - Fast inference (recommended for starters)");
  console.log("  • OpenRouter - Access to many models");
  console.log("  • Ollama     - Local models (privacy-focused)");
  console.log("  • LM Studio  - Local models (GUI-based)\n");

  const providerChoice = await select({
    message: "Which provider would you like to configure?",
    choices: [
      { name: "Groq (recommended - fast & easy)", value: "groq" },
      { name: "OpenRouter (access to many models)", value: "openrouter" },
      { name: "Both Groq and OpenRouter", value: "both" },
      { name: "Ollama (local, I have it running)", value: "ollama" },
      { name: "LM Studio (local, I have it running)", value: "lmstudio" },
      { name: "Skip for now (configure manually later)", value: "skip" },
    ],
  });

  if (providerChoice === "skip") {
    config.skip = true;
    return config;
  }

  // Groq configuration
  if (providerChoice === "groq" || providerChoice === "both") {
    console.log(kleur.cyan("\n🔑 Groq API Key\n"));
    console.log("Get your free API key at: https://console.groq.com/keys\n");

    const groqKey = await input({
      message: "Enter your Groq API key:",
      validate: validateGroqKey,
    });

    if (groqKey) {
      config.providers.groq = groqKey;
    }
  }

  // OpenRouter configuration
  if (providerChoice === "openrouter" || providerChoice === "both") {
    console.log(kleur.cyan("\n🔑 OpenRouter API Key\n"));
    console.log("Get your API key at: https://openrouter.ai/keys\n");

    const openrouterKey = await input({
      message: "Enter your OpenRouter API key:",
      validate: validateOpenRouterKey,
    });

    if (openrouterKey) {
      config.providers.openrouter = openrouterKey;
    }
  }

  // Local provider flags
  if (providerChoice === "ollama") {
    config.providers.ollama = true;
  }

  if (providerChoice === "lmstudio") {
    config.providers.lmstudio = true;
  }

  // Generate encryption key
  console.log(kleur.cyan("\n🔐 Security Configuration\n"));
  console.log("Generating encryption key for secure storage...");
  config.encryption_key = generateEncryptionKey();
  console.log(kleur.green("✓ Generated 256-bit AES encryption key\n"));

  return config;
}

/**
 * Write configuration to .env file
 */
export function writeEnvConfig(config: SetupConfig): void {
  if (config.skip) {
    console.log(
      kleur.gray(
        "\n   Configuration skipped - you can run this wizard again with:",
      ),
    );
    console.log(kleur.gray("   bun scripts/first-time-setup.ts\n"));
    return;
  }

  // Read .env.example as template
  let envContent = "";
  if (existsSync(ENV_EXAMPLE_PATH)) {
    envContent = readFileSync(ENV_EXAMPLE_PATH, "utf-8");
  }

  // Apply provider configurations
  if (config.providers.groq) {
    envContent = envContent.replace(
      /^GROQ_API_KEY=.*$/m,
      `GROQ_API_KEY=${config.providers.groq}`,
    );
  }

  if (config.providers.openrouter) {
    envContent = envContent.replace(
      /^OPENROUTER_API_KEY=.*$/m,
      `OPENROUTER_API_KEY=${config.providers.openrouter}`,
    );
  }

  if (config.encryption_key) {
    envContent = envContent.replace(
      /^THIRD_EYE_SECURITY_ENCRYPTION_KEY=.*$/m,
      `THIRD_EYE_SECURITY_ENCRYPTION_KEY=${config.encryption_key}`,
    );
  }

  // Write to .env
  writeFileSync(ENV_PATH, envContent);

  console.log(kleur.green("\n✅ Configuration saved to .env\n"));
  console.log(kleur.white("Configured providers:"));
  if (config.providers.groq) console.log(kleur.green("  ✓ Groq"));
  if (config.providers.openrouter) console.log(kleur.green("  ✓ OpenRouter"));
  if (config.providers.ollama) console.log(kleur.green("  ✓ Ollama (local)"));
  if (config.providers.lmstudio)
    console.log(kleur.green("  ✓ LM Studio (local)"));
  console.log(kleur.green("  ✓ Encryption enabled"));

  console.log(kleur.cyan("\n🚀 Next Steps:\n"));
  console.log("  1. Start Third Eye MCP:");
  console.log(kleur.yellow("     bun up\n"));
  console.log("  2. Open the UI:");
  console.log(kleur.cyan("     http://127.0.0.1:3300\n"));
  console.log("  3. Connect your AI agent using the MCP protocol\n");
}

/**
 * Main entry point for the wizard
 */
async function main() {
  try {
    // Don't run in CI environments
    if (process.env.CI) {
      console.log("CI environment detected, skipping interactive setup");
      return;
    }

    const config = await firstTimeSetup();
    writeEnvConfig(config);
  } catch (error) {
    if (error instanceof Error && error.message.includes("User force closed")) {
      console.log(
        kleur.yellow(
          "\n\n⚠️  Setup cancelled. You can run this wizard again with:",
        ),
      );
      console.log(kleur.gray("   bun scripts/first-time-setup.ts\n"));
      process.exit(0);
    }
    throw error;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
