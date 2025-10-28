import { z } from "zod";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

/**
 * Third Eye MCP Configuration Schema
 */
const ConfigObjectSchema = z.object({
  // Database
  db: z
    .object({
      path: z.string().default("~/.third-eye-mcp/mcp.db"),
    })
    .default({}),

  // Server
  server: z
    .object({
      host: z.string().default("127.0.0.1"),
      port: z.number().default(7070),
    })
    .default({}),

  // UI
  ui: z
    .object({
      port: z.number().default(3300),
      autoOpen: z.boolean().default(true),
    })
    .default({}),

  // Providers
  providers: z
    .object({
      groq: z
        .object({
          baseUrl: z.string().default("https://api.groq.com/openai/v1"),
          apiKey: z.string().optional(),
        })
        .optional(),
      openrouter: z
        .object({
          baseUrl: z.string().default("https://openrouter.ai/api/v1"),
          apiKey: z.string().optional(),
        })
        .optional(),
      ollama: z
        .object({
          baseUrl: z.string().default("http://127.0.0.1:11434"),
        })
        .optional(),
      lmstudio: z
        .object({
          baseUrl: z.string().default("http://127.0.0.1:1234"),
        })
        .optional(),
    })
    .default({}),

  // Security
  security: z
    .object({
      bindWarning: z.boolean().default(true),
      encryptionKey: z.string().optional(),
      allowedOrigins: z.array(z.string()).optional(),
    })
    .default({}),

  // Telemetry
  telemetry: z
    .object({
      enabled: z.boolean().default(false),
      endpoint: z.string().optional(),
    })
    .default({}),

  rateLimits: z
    .object({
      userRps: z.number().default(2),
      sessionRps: z.number().default(2),
    })
    .default({}),

  // Theme and UI preferences
  theme: z
    .object({
      name: z.enum(["third-eye"]).default("third-eye"),
      darkMode: z.boolean().default(true),
    })
    .default({}),
});

export const ConfigSchema = ConfigObjectSchema.default({});

export type Config = z.infer<typeof ConfigSchema>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K] | undefined;
};

const cloneValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, val]) => {
        acc[key] = cloneValue(val as unknown);
        return acc;
      },
      {},
    ) as T;
  }
  return value;
};

const mergeInto = (
  target: Record<string, unknown>,
  source?: Record<string, unknown> | null,
): void => {
  if (!source) {
    return;
  }

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      target[key] = value.slice();
      return;
    }

    if (value && typeof value === "object") {
      const targetChild = target[key];
      const nextTarget =
        targetChild &&
        typeof targetChild === "object" &&
        !Array.isArray(targetChild)
          ? (targetChild as Record<string, unknown>)
          : {};
      const clonedTarget =
        nextTarget === targetChild ? nextTarget : cloneValue(nextTarget);
      mergeInto(clonedTarget, value as Record<string, unknown>);
      target[key] = clonedTarget;
      return;
    }

    target[key] = value;
  });
};

const deepMerge = <T>(base: T, ...sources: DeepPartial<T>[]): T => {
  const result = cloneValue(base) as Record<string, unknown>;
  sources.forEach((source) =>
    mergeInto(result, source as Record<string, unknown>),
  );
  return result as T;
};

/**
 * Default configuration
 */
export const defaultConfig: Config = {
  db: {
    path: "~/.third-eye-mcp/mcp.db",
  },
  server: {
    host: "127.0.0.1",
    port: 7070,
  },
  ui: {
    port: 3300,
    autoOpen: true,
  },
  providers: {},
  security: {
    bindWarning: true,
    allowedOrigins: [],
  },
  telemetry: {
    enabled: false,
  },
  rateLimits: {
    userRps: 2,
    sessionRps: 2,
  },
  theme: {
    name: "third-eye",
    darkMode: true,
  },
};

/**
 * Get configuration directory path
 */
export function getConfigDir(): string {
  const configDir = resolve(homedir(), ".third-eye-mcp");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  return configDir;
}

/**
 * Get configuration file path
 */
export function getConfigPath(): string {
  return resolve(getConfigDir(), "config.json");
}

function parseOptionalBoolean(value?: string | null): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check port conflicts using MCP_* env vars
  const rawServerPort = process.env.MCP_PORT || process.env.PORT;
  const parsedServerPort = rawServerPort
    ? parseInt(rawServerPort, 10)
    : undefined;
  const serverPort = Number.isFinite(parsedServerPort)
    ? (parsedServerPort as number)
    : 7070;
  const uiPort = process.env.MCP_UI_PORT
    ? parseInt(process.env.MCP_UI_PORT, 10)
    : 3300;

  if (serverPort === uiPort) {
    errors.push(
      `Port conflict: MCP_PORT and MCP_UI_PORT cannot be the same (${serverPort})`,
    );
  }

  if (serverPort < 1024 || serverPort > 65535) {
    errors.push(
      `Invalid MCP_PORT: ${serverPort} (must be between 1024 and 65535)`,
    );
  }

  if (uiPort < 1024 || uiPort > 65535) {
    errors.push(
      `Invalid MCP_UI_PORT: ${uiPort} (must be between 1024 and 65535)`,
    );
  }

  // Check host binding
  const host = process.env.MCP_HOST || process.env.HOST || "127.0.0.1";
  if (host === "0.0.0.0") {
    console.warn(
      "\n⚠️  WARNING: Server is binding to 0.0.0.0 (all interfaces)",
    );
    console.warn("   This exposes your Third Eye MCP instance to the network.");
    console.warn("   Use 127.0.0.1 (localhost) for local-only access.\n");
  }

  // Check database path is writable
  const dbPath = process.env.MCP_DB || "~/.third-eye-mcp/mcp.db";
  if (dbPath.includes("..")) {
    errors.push(`Invalid MCP_DB path: ${dbPath} (path traversal not allowed)`);
  }

  // Validate provider API keys format (if provided)
  if (
    process.env.GROQ_API_KEY &&
    !process.env.GROQ_API_KEY.startsWith("gsk_")
  ) {
    errors.push('Invalid GROQ_API_KEY format (should start with "gsk_")');
  }

  if (
    process.env.OPENROUTER_API_KEY &&
    !process.env.OPENROUTER_API_KEY.startsWith("sk-")
  ) {
    errors.push('Invalid OPENROUTER_API_KEY format (should start with "sk-")');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load configuration from file and environment
 */
export function loadConfig(): Config {
  let fileConfig: DeepPartial<Config> = {};

  // Load from config file if exists
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const fileContent = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      if (parsed && typeof parsed === "object") {
        fileConfig = parsed as DeepPartial<Config>;
      }
    } catch (error) {
      console.warn("Failed to parse config file:", error);
    }
  }

  // Merge with environment variables
  const envServerPort = process.env.MCP_PORT || process.env.PORT;
  const parsedEnvServerPort = envServerPort
    ? parseInt(envServerPort, 10)
    : undefined;
  const normalizedServerPort = Number.isFinite(parsedEnvServerPort)
    ? parsedEnvServerPort
    : undefined;

  const envConfig: DeepPartial<Config> = {};

  if (process.env.MCP_DB) {
    envConfig.db = { path: process.env.MCP_DB };
  }

  const serverEnv: DeepPartial<Config>["server"] = {};
  const envServerHost = process.env.MCP_HOST ?? process.env.HOST;
  if (envServerHost) {
    serverEnv.host = envServerHost;
  }
  if (normalizedServerPort !== undefined) {
    serverEnv.port = normalizedServerPort;
  }
  if (Object.keys(serverEnv).length > 0) {
    envConfig.server = { ...(envConfig.server ?? {}), ...serverEnv };
  }

  const uiEnv: DeepPartial<Config>["ui"] = {};
  if (process.env.MCP_UI_PORT) {
    const parsed = parseInt(process.env.MCP_UI_PORT, 10);
    if (Number.isFinite(parsed)) {
      uiEnv.port = parsed;
    }
  }
  const autoOpen = parseOptionalBoolean(process.env.MCP_AUTO_OPEN);
  if (autoOpen !== undefined) {
    uiEnv.autoOpen = autoOpen;
  }
  if (Object.keys(uiEnv).length > 0) {
    envConfig.ui = { ...(envConfig.ui ?? {}), ...uiEnv };
  }

  const providerEnv: Record<string, Record<string, string>> = {};
  if (process.env.GROQ_API_KEY || process.env.GROQ_BASE_URL) {
    const groqEnv: Record<string, string> = { ...(providerEnv.groq ?? {}) };
    if (process.env.GROQ_API_KEY) {
      groqEnv.apiKey = process.env.GROQ_API_KEY;
    }
    if (process.env.GROQ_BASE_URL) {
      groqEnv.baseUrl = process.env.GROQ_BASE_URL;
    }
    providerEnv.groq = groqEnv;
  }
  if (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_BASE_URL) {
    const openrouterEnv: Record<string, string> = {
      ...(providerEnv.openrouter ?? {}),
    };
    if (process.env.OPENROUTER_API_KEY) {
      openrouterEnv.apiKey = process.env.OPENROUTER_API_KEY;
    }
    if (process.env.OPENROUTER_BASE_URL) {
      openrouterEnv.baseUrl = process.env.OPENROUTER_BASE_URL;
    }
    providerEnv.openrouter = openrouterEnv;
  }
  if (process.env.OLLAMA_BASE_URL) {
    providerEnv.ollama = {
      ...(providerEnv.ollama ?? {}),
      baseUrl: process.env.OLLAMA_BASE_URL,
    };
  }
  if (process.env.LMSTUDIO_BASE_URL) {
    providerEnv.lmstudio = {
      ...(providerEnv.lmstudio ?? {}),
      baseUrl: process.env.LMSTUDIO_BASE_URL,
    };
  }
  if (Object.keys(providerEnv).length > 0) {
    envConfig.providers = providerEnv as DeepPartial<Config>["providers"];
  }

  const telemetryEnabled = parseOptionalBoolean(process.env.TELEMETRY_ENABLED);
  const telemetryEndpoint = process.env.TELEMETRY_ENDPOINT;
  if (telemetryEnabled !== undefined || telemetryEndpoint) {
    envConfig.telemetry = {
      ...(envConfig.telemetry ?? {}),
      ...(telemetryEnabled !== undefined ? { enabled: telemetryEnabled } : {}),
      ...(telemetryEndpoint ? { endpoint: telemetryEndpoint } : {}),
    };
  }

  const rateLimitEnv: DeepPartial<Config>["rateLimits"] = {};
  if (process.env.RATE_LIMIT_USER_RPS) {
    const parsed = parseInt(process.env.RATE_LIMIT_USER_RPS, 10);
    if (Number.isFinite(parsed)) {
      rateLimitEnv.userRps = parsed;
    }
  }
  if (process.env.RATE_LIMIT_SESSION_RPS) {
    const parsed = parseInt(process.env.RATE_LIMIT_SESSION_RPS, 10);
    if (Number.isFinite(parsed)) {
      rateLimitEnv.sessionRps = parsed;
    }
  }
  if (Object.keys(rateLimitEnv).length > 0) {
    envConfig.rateLimits = rateLimitEnv;
  }

  const encryptionKey = process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY;
  const bindWarning = parseOptionalBoolean(process.env.MCP_BIND_WARNING);
  const allowedOriginsEnv = process.env.MCP_ALLOWED_ORIGINS
    ? process.env.MCP_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : undefined;
  if (encryptionKey || bindWarning !== undefined || allowedOriginsEnv) {
    envConfig.security = {
      ...(envConfig.security ?? {}),
      ...(encryptionKey ? { encryptionKey } : {}),
      ...(bindWarning !== undefined ? { bindWarning } : {}),
      ...(allowedOriginsEnv ? { allowedOrigins: allowedOriginsEnv } : {}),
    };
  }

  // Merge configs: defaults < file < env
  const mergedConfig = deepMerge(defaultConfig, fileConfig, envConfig);

  // Validate and return
  return ConfigSchema.parse(mergedConfig);
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Expand tilde in paths
 */
export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  return path;
}

// Singleton config instance
let _configInstance: Config | null = null;

/**
 * Get singleton config instance
 */
export function getConfig(): Config {
  if (!_configInstance) {
    // Validate environment before loading
    const validation = validateEnvironment();
    if (!validation.valid) {
      console.error("\n❌ Environment validation failed:\n");
      validation.errors.forEach((err) => console.error(`   • ${err}`));
      console.error("\nPlease fix these issues and try again.\n");
      throw new Error("Invalid environment configuration");
    }
    _configInstance = loadConfig();
  }
  return _configInstance;
}

/**
 * Reload configuration from disk
 */
export function reloadConfig(): Config {
  _configInstance = loadConfig();
  return _configInstance;
}
