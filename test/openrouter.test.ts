import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenRouterClient } from '../src/openrouter/client.js';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe('OpenRouterClient.validateKey', () => {
  it('returns account info on 200', async () => {
    mockFetchOnce(200, { data: { label: 'my-key', limit: 10, usage: 2, is_free_tier: false } });
    const client = new OpenRouterClient({ apiKey: 'sk-or-test' });
    const info = await client.validateKey();
    expect(info.label).toBe('my-key');
    expect(info.limit).toBe(10);
    expect(info.usage).toBe(2);
  });

  it('throws a friendly error on 401', async () => {
    mockFetchOnce(401, {});
    const client = new OpenRouterClient({ apiKey: 'bad' });
    await expect(client.validateKey()).rejects.toThrow(/Invalid API key/);
  });

  it('tolerates endpoints without /auth/key (404)', async () => {
    mockFetchOnce(404, {});
    const client = new OpenRouterClient({ apiKey: 'sk', baseUrl: 'http://localhost:1234/v1' });
    const info = await client.validateKey();
    expect(info.label).toMatch(/no \/auth\/key/);
  });
});

describe('OpenRouterClient.listModels', () => {
  it('normalizes free vs paid and pricing', async () => {
    mockFetchOnce(200, {
      data: [
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', context_length: 128000, pricing: { prompt: '0.00000015', completion: '0.0000006' } },
        { id: 'meta/llama-3:free', name: 'Llama 3 Free', context_length: 8192, pricing: { prompt: '0', completion: '0' } },
      ],
    });
    const client = new OpenRouterClient({ apiKey: 'sk' });
    const models = await client.listModels();
    const paid = models.find((m) => m.id === 'openai/gpt-4o-mini')!;
    const free = models.find((m) => m.id === 'meta/llama-3:free')!;
    expect(paid.isFree).toBe(false);
    expect(paid.contextLength).toBe(128000);
    expect(free.isFree).toBe(true);
  });
});

describe('OpenRouterClient.streamChat', () => {
  it('assembles streamed text and tool calls', async () => {
    const chunks: ChatCompletionChunk[] = [
      chunk({ content: 'Hello ' }),
      chunk({ content: 'world' }),
      chunk({
        tool_calls: [
          { index: 0, id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{"pa' } },
        ],
      }),
      chunk({
        tool_calls: [{ index: 0, function: { arguments: 'th":"a.txt"}' } }],
      }),
    ];
    const client = new OpenRouterClient({ apiKey: 'sk' });
    // Inject a fake OpenAI stream.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).client = {
      chat: { completions: { create: async () => asyncIterable(chunks) } },
    };

    let streamed = '';
    const turn = await client.streamChat('any/model', [{ role: 'user', content: 'hi' }], undefined, {
      onText: (d) => (streamed += d),
    });

    expect(streamed).toBe('Hello world');
    expect(turn.content).toBe('Hello world');
    expect(turn.toolCalls).toHaveLength(1);
    expect(turn.toolCalls[0].name).toBe('read_file');
    expect(turn.toolCalls[0].arguments).toBe('{"path":"a.txt"}');
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chunk(delta: any): ChatCompletionChunk {
  return {
    id: 'x',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'm',
    choices: [{ index: 0, delta, finish_reason: null }],
  } as ChatCompletionChunk;
}

async function* asyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}
