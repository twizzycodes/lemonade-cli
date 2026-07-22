export async function withRetry(fn, opts = {}) {
    const retries = opts.retries ?? 3;
    const base = opts.baseDelayMs ?? 500;
    const max = opts.maxDelayMs ?? 8000;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        }
        catch (err) {
            attempt++;
            if (attempt > retries || !isTransient(err))
                throw err;
            const jitter = Math.random() * base;
            const delay = Math.min(max, base * 2 ** (attempt - 1) + jitter);
            opts.onRetry?.(attempt, delay, err);
            await sleep(delay);
        }
    }
}
function isTransient(err) {
    const status = getStatus(err);
    if (status === 429)
        return true;
    if (status !== undefined && status >= 500)
        return true;
    // Network-level errors (no HTTP status) are usually worth one retry.
    if (status === undefined && err instanceof Error) {
        return /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(err.message);
    }
    return false;
}
export function getStatus(err) {
    if (err && typeof err === 'object') {
        const anyErr = err;
        return anyErr.status ?? anyErr.response?.status;
    }
    return undefined;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** Turn an SDK/HTTP error into a friendly, actionable message. */
export function friendlyError(err) {
    const status = getStatus(err);
    const msg = err instanceof Error ? err.message : String(err);
    if (status === 401 || status === 403) {
        return 'Authentication failed. Your API key may be invalid or revoked — check https://openrouter.ai/keys or run /settings to re-enter it.';
    }
    if (status === 429) {
        return 'Rate limited by the provider. Wait a moment and retry, or switch to a different model with /model. Free-tier models have tighter limits.';
    }
    if (status === 402) {
        return 'Payment required — your OpenRouter credit balance may be exhausted. Check your dashboard at https://openrouter.ai/credits.';
    }
    if (status !== undefined && status >= 500) {
        return `The model provider returned a server error (HTTP ${status}). This is usually transient — try again.`;
    }
    return msg;
}
//# sourceMappingURL=retry.js.map