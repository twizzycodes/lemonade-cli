import OpenAI from 'openai';
import { DEFAULT_BASE_URL } from '../config/config.js';
/**
 * Thin wrapper around the OpenAI SDK pointed at OpenRouter's
 * OpenAI-compatible endpoint. Also works against any other compatible endpoint
 * (Ollama, LM Studio, self-hosted) by overriding `baseUrl`.
 */
/** Recommended OpenRouter attribution headers (optional but polite). */
const OPENROUTER_HEADERS = {
    'HTTP-Referer': 'https://github.com/lemonade-cli/lemonade',
    'X-Title': 'Lemonade CLI',
};
export class OpenRouterClient {
    client;
    baseUrl;
    apiKey;
    constructor(opts) {
        this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
        this.apiKey = opts.apiKey;
        this.client = new OpenAI({
            apiKey: opts.apiKey,
            baseURL: this.baseUrl,
            defaultHeaders: OPENROUTER_HEADERS,
        });
    }
    /**
     * Validate the key with a lightweight authenticated request. Returns account
     * info on success; throws a friendly Error on failure.
     */
    async validateKey() {
        const res = await fetch(`${this.baseUrl}/auth/key`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                ...OPENROUTER_HEADERS,
            },
        });
        if (res.status === 401) {
            throw new Error('Invalid API key (401). Check the key at https://openrouter.ai/keys');
        }
        if (!res.ok) {
            // Some compatible endpoints don't implement /auth/key; treat 404 as "can't
            // verify but not necessarily invalid".
            if (res.status === 404) {
                return { label: 'unknown (endpoint has no /auth/key)' };
            }
            throw new Error(`Could not verify key (HTTP ${res.status}).`);
        }
        const body = (await res.json());
        const data = body.data ?? {};
        const limit = data.limit ?? null;
        return {
            label: data.label ?? undefined,
            limit,
            usage: data.usage ?? undefined,
            isFreeTier: data.is_free_tier ?? undefined,
        };
    }
    /** Fetch the model catalog and normalize the fields Lemonade displays. */
    async listModels() {
        const res = await fetch(`${this.baseUrl}/models`, {
            headers: { Authorization: `Bearer ${this.apiKey}`, ...OPENROUTER_HEADERS },
        });
        if (!res.ok) {
            throw new Error(`Could not fetch models (HTTP ${res.status}).`);
        }
        const body = (await res.json());
        const models = body.data ?? [];
        return models.map(normalizeModel).sort((a, b) => a.id.localeCompare(b.id));
    }
    /**
     * Stream a chat completion. Emits text deltas via `handlers.onText` and
     * returns the fully assembled assistant message (including any tool calls) so
     * the agent loop can act on it.
     */
    async streamChat(model, messages, tools, handlers = {}) {
        const stream = await this.client.chat.completions.create({
            model,
            messages,
            tools: tools && tools.length > 0 ? tools : undefined,
            stream: true,
        }, { signal: handlers.signal });
        let content = '';
        const toolCalls = [];
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta)
                continue;
            if (delta.content) {
                content += delta.content;
                handlers.onText?.(delta.content);
            }
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    const existing = (toolCalls[idx] ??= {
                        id: tc.id ?? `call_${idx}`,
                        name: '',
                        arguments: '',
                    });
                    if (tc.id)
                        existing.id = tc.id;
                    if (tc.function?.name)
                        existing.name += tc.function.name;
                    if (tc.function?.arguments)
                        existing.arguments += tc.function.arguments;
                }
            }
        }
        return { content, toolCalls: toolCalls.filter(Boolean) };
    }
}
function normalizeModel(m) {
    const prompt = m.pricing?.prompt ? Number(m.pricing.prompt) : 0;
    const completion = m.pricing?.completion ? Number(m.pricing.completion) : 0;
    const isFree = m.id.endsWith(':free') || (prompt === 0 && completion === 0);
    return {
        id: m.id,
        name: m.name ?? m.id,
        contextLength: m.context_length,
        promptPrice: prompt,
        completionPrice: completion,
        isFree,
    };
}
//# sourceMappingURL=client.js.map