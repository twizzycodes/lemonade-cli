import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Sandbox } from '../src/agent/sandbox.js';
import { SessionStore } from '../src/session/log.js';
import { ToolExecutor } from '../src/agent/tools.js';
import { runAgent } from '../src/agent/loop.js';
import type { OpenRouterClient, AssistantTurn } from '../src/openrouter/client.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

let dir: string;
let executor: ToolExecutor;
let store: SessionStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lemonade-test-'));
  store = new SessionStore(dir);
  executor = new ToolExecutor({
    sandbox: new Sandbox(dir),
    store,
    autoApprove: true, // don't prompt in tests
    dangerouslySkip: false,
    confirm: async () => true,
  });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ToolExecutor file tools', () => {
  it('writes and reads a file', async () => {
    const w = await executor.execute('write_file', JSON.stringify({ path: 'hello.txt', content: 'hi there' }));
    expect(w.ok).toBe(true);
    expect(readFileSync(join(dir, 'hello.txt'), 'utf8')).toBe('hi there');

    const r = await executor.execute('read_file', JSON.stringify({ path: 'hello.txt' }));
    expect(r.output).toBe('hi there');
  });

  it('edits a file only when old_str is unique', async () => {
    writeFileSync(join(dir, 'code.js'), 'const a = 1;\nconst b = 2;\n');
    const ok = await executor.execute('edit_file', JSON.stringify({ path: 'code.js', old_str: 'const a = 1;', new_str: 'const a = 42;' }));
    expect(ok.ok).toBe(true);
    expect(readFileSync(join(dir, 'code.js'), 'utf8')).toContain('const a = 42;');

    writeFileSync(join(dir, 'dup.js'), 'x\nx\n');
    const bad = await executor.execute('edit_file', JSON.stringify({ path: 'dup.js', old_str: 'x', new_str: 'y' }));
    expect(bad.ok).toBe(false);
    expect(bad.output).toMatch(/must be unique/);
  });

  it('refuses to escape the sandbox', async () => {
    const res = await executor.execute('read_file', JSON.stringify({ path: '../../../etc/passwd' }));
    expect(res.ok).toBe(false);
    expect(res.output).toMatch(/outside/);
  });

  it('searches file contents', async () => {
    writeFileSync(join(dir, 'a.txt'), 'find me\nnope\n');
    const res = await executor.execute('search_files', JSON.stringify({ pattern: 'find me' }));
    expect(res.ok).toBe(true);
    expect(res.output).toMatch(/a\.txt:1/);
  });

  it('records changes for undo', async () => {
    await executor.execute('write_file', JSON.stringify({ path: 'x.txt', content: 'v1' }));
    const change = store.popChange();
    expect(change?.existedBefore).toBe(false);
    expect(change?.after).toBe('v1');
  });
});

describe('runAgent loop', () => {
  it('executes tool calls then returns the final text', async () => {
    const turns: AssistantTurn[] = [
      {
        content: 'Creating the file.',
        toolCalls: [{ id: 'c1', name: 'write_file', arguments: JSON.stringify({ path: 'out.txt', content: 'done' }) }],
      },
      { content: 'All set! Created out.txt.', toolCalls: [] },
    ];
    const fakeClient = {
      streamChat: async (
        _model: string,
        _history: ChatCompletionMessageParam[],
        _tools: unknown,
        handlers: { onText?: (d: string) => void },
      ): Promise<AssistantTurn> => {
        const turn = turns.shift()!;
        handlers.onText?.(turn.content);
        return turn;
      },
    } as unknown as OpenRouterClient;

    const history: ChatCompletionMessageParam[] = [{ role: 'user', content: 'make out.txt' }];
    const toolResults: string[] = [];
    const result = await runAgent(fakeClient, 'm', history, executor, {
      onToolResult: (_n, res) => toolResults.push(res.display),
    });

    expect(existsSync(join(dir, 'out.txt'))).toBe(true);
    expect(readFileSync(join(dir, 'out.txt'), 'utf8')).toBe('done');
    expect(result.toolCallCount).toBe(1);
    expect(result.finalText).toMatch(/All set/);
    // History should include the tool result message so the model saw it.
    expect(history.some((m) => m.role === 'tool')).toBe(true);
  });
});
