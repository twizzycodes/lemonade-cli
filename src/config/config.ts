import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';

/**
 * Persistent, per-machine configuration for Lemonade.
 *
 * Lives at ~/.lemonade/config.json. The OpenRouter API key is stored here in
 * plaintext (as most CLIs do) but is NEVER printed back in full — use
 * {@link maskKey} anywhere it is displayed. The repo's .gitignore excludes
 * `.lemonade/` and `.env` so a real key can never be committed from a dev
 * checkout.
 */
export interface LemonadeConfig {
  /** Display name used in the welcome greeting. */
  username?: string;
  /** OpenRouter API key (or a key for any OpenAI-compatible endpoint). */
  apiKey?: string;
  /** Default model slug, e.g. "openai/gpt-4o-mini". */
  model?: string;
  /** Base URL for the OpenAI-compatible API. Advanced override. */
  baseUrl?: string;
  /** Skip confirmations for non-destructive tool calls. */
  autoApprove?: boolean;
  /** Disable startup/streaming animations (helpful over slow SSH). */
  animations?: boolean;
}

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const CONFIG_DIR = join(homedir(), '.lemonade');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function configDir(): string {
  return CONFIG_DIR;
}

export function configPath(): string {
  return CONFIG_PATH;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Read config from disk, returning an empty object if none exists or is corrupt. */
export function loadConfig(): LemonadeConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LemonadeConfig;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // A corrupt config shouldn't hard-crash the CLI; treat as empty.
    return {};
  }
}

/** Persist the full config object to disk (pretty-printed). */
export function saveConfig(config: LemonadeConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
  });
}

/** Merge a partial update into the existing config and persist it. */
export function updateConfig(patch: Partial<LemonadeConfig>): LemonadeConfig {
  const next = { ...loadConfig(), ...patch };
  saveConfig(next);
  return next;
}

/** Remove the saved API key (used by /logout). */
export function clearApiKey(): LemonadeConfig {
  const cfg = loadConfig();
  delete cfg.apiKey;
  saveConfig(cfg);
  return cfg;
}

/** Delete the entire config file (used by tests / full reset). */
export function deleteConfig(): void {
  if (existsSync(CONFIG_PATH)) rmSync(CONFIG_PATH);
}

/**
 * Resolve the effective API key: the LEMONADE_API_KEY env var takes precedence
 * over the saved config so CI and one-off runs can inject a key without writing
 * it to disk.
 */
export function resolveApiKey(config: LemonadeConfig = loadConfig()): string | undefined {
  return process.env.LEMONADE_API_KEY ?? config.apiKey;
}

export function resolveBaseUrl(config: LemonadeConfig = loadConfig()): string {
  return process.env.LEMONADE_BASE_URL ?? config.baseUrl ?? DEFAULT_BASE_URL;
}

export function resolveModel(config: LemonadeConfig = loadConfig()): string {
  return config.model ?? DEFAULT_MODEL;
}

/** True once the user has completed first-run setup (name + key present). */
export function isConfigured(config: LemonadeConfig = loadConfig()): boolean {
  return Boolean(config.username && resolveApiKey(config));
}

/**
 * Mask a secret for display, keeping a recognizable prefix and the last few
 * characters, e.g. "sk-or-...ab12". Never returns the full key.
 */
export function maskKey(key: string | undefined, tail = 4): string {
  if (!key) return '(none)';
  const prefix = key.startsWith('sk-or-') ? 'sk-or-' : key.slice(0, 3);
  const end = key.slice(-tail);
  return `${prefix}...${end}`;
}
