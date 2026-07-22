import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, } from 'node:fs';
export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const CONFIG_DIR = join(homedir(), '.lemonade');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export function configDir() {
    return CONFIG_DIR;
}
export function configPath() {
    return CONFIG_PATH;
}
function ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
/** Read config from disk, returning an empty object if none exists or is corrupt. */
export function loadConfig() {
    try {
        if (!existsSync(CONFIG_PATH))
            return {};
        const raw = readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        // A corrupt config shouldn't hard-crash the CLI; treat as empty.
        return {};
    }
}
/** Persist the full config object to disk (pretty-printed). */
export function saveConfig(config) {
    ensureConfigDir();
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', {
        mode: 0o600,
    });
}
/** Merge a partial update into the existing config and persist it. */
export function updateConfig(patch) {
    const next = { ...loadConfig(), ...patch };
    saveConfig(next);
    return next;
}
/** Remove the saved API key (used by /logout). */
export function clearApiKey() {
    const cfg = loadConfig();
    delete cfg.apiKey;
    saveConfig(cfg);
    return cfg;
}
/** Delete the entire config file (used by tests / full reset). */
export function deleteConfig() {
    if (existsSync(CONFIG_PATH))
        rmSync(CONFIG_PATH);
}
/**
 * Resolve the effective API key: the LEMONADE_API_KEY env var takes precedence
 * over the saved config so CI and one-off runs can inject a key without writing
 * it to disk.
 */
export function resolveApiKey(config = loadConfig()) {
    return process.env.LEMONADE_API_KEY ?? config.apiKey;
}
export function resolveBaseUrl(config = loadConfig()) {
    return process.env.LEMONADE_BASE_URL ?? config.baseUrl ?? DEFAULT_BASE_URL;
}
export function resolveModel(config = loadConfig()) {
    return config.model ?? DEFAULT_MODEL;
}
/** True once the user has completed first-run setup (name + key present). */
export function isConfigured(config = loadConfig()) {
    return Boolean(config.username && resolveApiKey(config));
}
/**
 * Mask a secret for display, keeping a recognizable prefix and the last few
 * characters, e.g. "sk-or-...ab12". Never returns the full key.
 */
export function maskKey(key, tail = 4) {
    if (!key)
        return '(none)';
    const prefix = key.startsWith('sk-or-') ? 'sk-or-' : key.slice(0, 3);
    const end = key.slice(-tail);
    return `${prefix}...${end}`;
}
//# sourceMappingURL=config.js.map