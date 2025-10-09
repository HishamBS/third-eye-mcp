import { z } from 'zod';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

/**
 * Third Eye MCP Configuration Schema
 */
export const ConfigSchema = z.object({
  // Database
  db: z.object({
    path: z.string().default('~/.third-eye-mcp/mcp.db'),
  }).default({}),

  // Server
  server: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.number().default(7070),
  }).default({}),

  // UI
  ui: z.object({
    port: z.number().default(3300),
    autoOpen: z.boolean().default(true),
  }).default({}),

  // Providers
  providers: z.object({
    groq: z.object({
      baseUrl: z.string().default('https://api.groq.com/openai/v1'),
      apiKey: z.string().optional(),
    }).optional(),
    openrouter: z.object({
      baseUrl: z.string().default('https://openrouter.ai/api/v1'),
      apiKey: z.string().optional(),
    }).optional(),
    ollama: z.object({
      baseUrl: z.string().default('http://127.0.0.1:11434'),
    }).optional(),
    lmstudio: z.object({
      baseUrl: z.string().default('http://127.0.0.1:1234'),
    }).optional(),
  }).default({}),

  // Security
  security: z.object({
    bindWarning: z.boolean().default(true),
    encryptionKey: z.string().optional(),
    allowedOrigins: z.array(z.string()).optional(),
  }).default({}),

  // Telemetry
  telemetry: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().optional(),
  }).default({}),

  rateLimits: z.object({
    userRps: z.number().default(2),
    sessionRps: z.number().default(2),
  }).default({}),

  // Theme and UI preferences
  theme: z.object({
    name: z.enum(['third-eye']).default('third-eye'),
    darkMode: z.boolean().default(true),
  }).default({}),
}).default({});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration
 */
export const defaultConfig: Config = {
  db: {
    path: '~/.third-eye-mcp/mcp.db',
  },
  server: {
    host: '127.0.0.1',
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
    name: 'third-eye',
    darkMode: true,
  },
};

/**
 * Get configuration directory path
 */
export function getConfigDir(): string {
  const configDir = resolve(homedir(), '.third-eye-mcp');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  return configDir;
}

/**
 * Get configuration file path
 */
export function getConfigPath(): string {
  return resolve(getConfigDir(), 'config.json');
}

function parseOptionalBoolean(value?: string | null): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
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
  const parsedServerPort = rawServerPort ? parseInt(rawServerPort, 10) : undefined;
  const serverPort = Number.isFinite(parsedServerPort) ? parsedServerPort as number : 7070;
  const uiPort = process.env.MCP_UI_PORT ? parseInt(process.env.MCP_UI_PORT, 10) : 3300;

  if (serverPort === uiPort) {
    errors.push(`Port conflict: MCP_PORT and MCP_UI_PORT cannot be the same (${serverPort})`);
  }

  if (serverPort < 1024 || serverPort > 65535) {
    errors.push(`Invalid MCP_PORT: ${serverPort} (must be between 1024 and 65535)`);
  }

  if (uiPort < 1024 || uiPort > 65535) {
    errors.push(`Invalid MCP_UI_PORT: ${uiPort} (must be between 1024 and 65535)`);
  }

  // Check host binding
  const host = process.env.MCP_HOST || process.env.HOST || '127.0.0.1';
  if (host === '0.0.0.0') {
    console.warn('\n⚠️  WARNING: Server is binding to 0.0.0.0 (all interfaces)');
    console.warn('   This exposes your Third Eye MCP instance to the network.');
    console.warn('   Use 127.0.0.1 (localhost) for local-only access.\n');
  }

  // Check database path is writable
  const dbPath = process.env.MCP_DB || '~/.third-eye-mcp/mcp.db';
  if (dbPath.includes('..')) {
    errors.push(`Invalid MCP_DB path: ${dbPath} (path traversal not allowed)`);
  }

  // Validate provider API keys format (if provided)
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('gsk_')) {
    errors.push('Invalid GROQ_API_KEY format (should start with "gsk_")');
  }

  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('sk-')) {
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
  let fileConfig: any = {};

  // Load from config file if exists
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Failed to parse config file:', error);
    }
  }

  // Merge with environment variables
  const envServerPort = process.env.MCP_PORT || process.env.PORT;
  const parsedEnvServerPort = envServerPort ? parseInt(envServerPort, 10) : undefined;
  const normalizedServerPort = Number.isFinite(parsedEnvServerPort) ? parsedEnvServerPort : undefined;

  const envConfig = {
    db: {
      path: process.env.MCP_DB || fileConfig.db?.path,
    },
    server: {
      host: process.env.MCP_HOST || process.env.HOST || fileConfig.server?.host,
      port: normalizedServerPort ?? fileConfig.server?.port,
    },
    ui: {
      port: process.env.MCP_UI_PORT ? parseInt(process.env.MCP_UI_PORT, 10) : fileConfig.ui?.port,
      autoOpen: parseOptionalBoolean(process.env.MCP_AUTO_OPEN) ?? fileConfig.ui?.autoOpen,
    },
    providers: {
      groq: {
        apiKey: process.env.GROQ_API_KEY ?? fileConfig.providers?.groq?.apiKey,
        baseUrl: process.env.GROQ_BASE_URL ?? fileConfig.providers?.groq?.baseUrl,
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY ?? fileConfig.providers?.openrouter?.apiKey,
        baseUrl: process.env.OPENROUTER_BASE_URL ?? fileConfig.providers?.openrouter?.baseUrl,
      },
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL ?? fileConfig.providers?.ollama?.baseUrl,
      },
      lmstudio: {
        baseUrl: process.env.LMSTUDIO_BASE_URL ?? fileConfig.providers?.lmstudio?.baseUrl,
      },
    },
    telemetry: {
      enabled: parseOptionalBoolean(process.env.TELEMETRY_ENABLED) ?? fileConfig.telemetry?.enabled,
    },
    rateLimits: {
      userRps: process.env.RATE_LIMIT_USER_RPS ? parseInt(process.env.RATE_LIMIT_USER_RPS, 10) : fileConfig.rateLimits?.userRps,
      sessionRps: process.env.RATE_LIMIT_SESSION_RPS ? parseInt(process.env.RATE_LIMIT_SESSION_RPS, 10) : fileConfig.rateLimits?.sessionRps,
    },
    security: {
      encryptionKey: process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY || fileConfig.security?.encryptionKey,
      bindWarning: parseOptionalBoolean(process.env.MCP_BIND_WARNING) ?? fileConfig.security?.bindWarning,
      allowedOrigins: process.env.MCP_ALLOWED_ORIGINS
        ? process.env.MCP_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
        : fileConfig.security?.allowedOrigins,
    },
  };

  // Merge configs: defaults < file < env
  const mergedConfig = {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
  };

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
  if (path.startsWith('~/')) {
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
      console.error('\n❌ Environment validation failed:\n');
      validation.errors.forEach(err => console.error(`   • ${err}`));
      console.error('\nPlease fix these issues and try again.\n');
      throw new Error('Invalid environment configuration');
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
