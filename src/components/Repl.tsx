import React, { useEffect, useMemo, useRef, useState } from 'react';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { isAbsolute, resolve as resolvePathAbs } from 'node:path';
import { Box, Text, Static, useApp, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { theme } from '../theme.js';
import { WelcomeScreen } from './WelcomeScreen.js';
import { ModelPicker } from './ModelPicker.js';
import { SettingsScreen } from './SettingsScreen.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';
import { OpenRouterClient } from '../openrouter/client.js';
import { Sandbox } from '../agent/sandbox.js';
import { SessionStore } from '../session/log.js';
import { ToolExecutor, type ConfirmRequest, type ToolResult } from '../agent/tools.js';
import { runAgent } from '../agent/loop.js';
import { runSubagent } from '../agent/subagent.js';
import { systemPrompt } from '../agent/prompt.js';
import {
  type LemonadeConfig,
  clearApiKey,
  resolveApiKey,
  resolveBaseUrl,
  resolveModel,
  maskKey,
  updateConfig,
} from '../config/config.js';
import { parseCommand, formatHelp, type CommandApi } from '../commands/registry.js';
import { relativeTime } from '../utils/time.js';

interface ReplProps {
  version: string;
  initialConfig: LemonadeConfig;
  initialCwd: string;
  autoApprove: boolean;
  dangerouslySkip: boolean;
  animations: boolean;
  onLogout: () => void;
}

type Line =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool'; text: string; ok: boolean }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string };

type Overlay = 'none' | 'model' | 'settings' | 'confirm';

/**
 * Items rendered in the append-only <Static> region. The banner is the first
 * item so it prints at the very top, with the conversation appended beneath it
 * (Ink's <Static> always renders above the live input region).
 */
type StaticItem = { kind: 'banner' } | { kind: 'line'; line: Line };

const PLACEHOLDERS = [
  'Try "build a REST API for a bookstore"',
  'Try "/init a React todo app"',
  'Try "/folder ./my-project"',
  'Try "/model" to switch models',
  'Ask me to fix a bug or add a feature…',
];

export function Repl(props: ReplProps): React.JSX.Element {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [config, setConfig] = useState<LemonadeConfig>(props.initialConfig);
  const [lines, setLines] = useState<Line[]>([]);
  // Bumped by /clear to remount the <Static> region so the banner reprints
  // after we wipe the terminal.
  const [staticKey, setStaticKey] = useState(0);
  const [streaming, setStreaming] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [status, setStatus] = useState('');

  const sandboxRef = useRef(new Sandbox(props.initialCwd));
  const storeRef = useRef(new SessionStore(props.initialCwd));
  const historyRef = useRef<ChatCompletionMessageParam[]>([
    { role: 'system', content: systemPrompt(props.initialCwd) },
  ]);
  const streamBufferRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const confirmResolverRef = useRef<((v: boolean) => void) | null>(null);
  const lastCtrlCRef = useRef(0);

  const client = useMemo(
    () =>
      new OpenRouterClient({
        apiKey: resolveApiKey(config) ?? '',
        baseUrl: resolveBaseUrl(config),
      }),
    [config],
  );
  const model = resolveModel(config);

  // Welcome banner rendered once (stable) to avoid per-keystroke flicker.
  const banner = useMemo(
    () => (
      <WelcomeScreen
        version={props.version}
        username={config.username ?? 'friend'}
        model={model}
        maskedKey={maskKey(resolveApiKey(config))}
        cwd={sandboxRef.current.getRoot()}
        activity={storeRef.current.recentActivity()}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Rotate the input placeholder while idle.
  useEffect(() => {
    if (!props.animations) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [props.animations]);

  const addLine = (line: Line): void => setLines((prev) => [...prev, line]);

  const flushStream = (): void => {
    const buf = streamBufferRef.current;
    if (buf.trim()) addLine({ kind: 'assistant', text: buf });
    streamBufferRef.current = '';
    setStreaming('');
  };

  // ---- Confirmation bridge (async callback <-> React overlay) ---------------
  const confirm = (req: ConfirmRequest): Promise<boolean> =>
    new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setPendingConfirm(req);
      setOverlay('confirm');
    });

  const answerConfirm = (approved: boolean): void => {
    setOverlay('none');
    setPendingConfirm(null);
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    resolve?.(approved);
  };

  const makeExecutor = (signal: AbortSignal): ToolExecutor =>
    new ToolExecutor({
      sandbox: sandboxRef.current,
      store: storeRef.current,
      autoApprove: props.autoApprove || Boolean(config.autoApprove),
      dangerouslySkip: props.dangerouslySkip,
      confirm,
      signal,
      onProgress: (l) => addLine({ kind: 'info', text: l }),
    });

  // ---- Global keys ----------------------------------------------------------
  useInput((input_, key) => {
    if (key.ctrl && input_ === 'c') {
      const now = Date.now();
      if (now - lastCtrlCRef.current < 1500) {
        storeRef.current.saveSession();
        exit();
        return;
      }
      lastCtrlCRef.current = now;
      setStatus('Press Ctrl+C again to exit.');
      return;
    }
    // Esc or Ctrl+B interrupts the running task.
    if ((key.escape || (key.ctrl && input_ === 'b')) && busy) {
      abortRef.current?.abort();
      setStatus('Interrupting…');
    }
  });

  // ---- Agent turn -----------------------------------------------------------
  const runTurn = async (userText: string): Promise<void> => {
    addLine({ kind: 'user', text: userText });
    historyRef.current.push({ role: 'user', content: userText });
    storeRef.current.addMessage({ role: 'user', content: userText, at: Date.now() });

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setStatus('');

    const executor = makeExecutor(controller.signal);
    try {
      const result = await runAgent(client, model, historyRef.current, executor, {
        onText: (d) => {
          streamBufferRef.current += d;
          setStreaming(streamBufferRef.current);
        },
        onToolStart: () => flushStream(),
        onToolResult: (_name, res: ToolResult) =>
          addLine({ kind: 'tool', text: res.display, ok: res.ok }),
        onRetry: (attempt, delay) =>
          addLine({ kind: 'info', text: `Rate limited — retry ${attempt} in ${Math.round(delay)}ms…` }),
        signal: controller.signal,
      });
      flushStream();
      if (result.finalText.trim()) {
        storeRef.current.addMessage({ role: 'assistant', content: result.finalText, at: Date.now() });
      }
      storeRef.current.logActivity(summarize(userText));
      storeRef.current.saveSession();
    } catch (err) {
      flushStream();
      addLine({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
      abortRef.current = null;
      setStatus('');
    }
  };

  // ---- Command API ----------------------------------------------------------
  const api: CommandApi = {
    print: (text) => addLine({ kind: 'info', text }),
    showHelp: () => addLine({ kind: 'info', text: formatHelp() }),
    openSettings: () => setOverlay('settings'),
    openModelPicker: () => setOverlay('model'),
    logout: () => {
      clearApiKey();
      addLine({ kind: 'info', text: 'Logged out. Your API key was cleared.' });
      props.onLogout();
    },
    clearContext: () => {
      // Reset the model's memory and the current session transcript…
      historyRef.current = [{ role: 'system', content: systemPrompt(sandboxRef.current.getRoot()) }];
      storeRef.current.clearCurrent();
      // …then actually wipe the terminal (screen + scrollback) so the
      // conversation above disappears, and remount <Static> so the banner
      // redraws at the top of a clean screen.
      if (stdout.isTTY) stdout.write('\x1b[2J\x1b[3J\x1b[H');
      setLines([]);
      setStaticKey((k) => k + 1);
      addLine({ kind: 'info', text: 'Cleared. Fresh session started.' });
    },
    initProject: (args) => {
      const ask = args.trim()
        ? args
        : 'Ask me for the project type, language/framework, and name, then scaffold it here.';
      void runTurn(`Scaffold a new project in the current directory. ${ask}`);
    },
    changeFolder: (args) => {
      const target = args.trim();
      if (!target) {
        addLine({ kind: 'info', text: `Working directory: ${sandboxRef.current.getRoot()}` });
        return;
      }
      const abs = resolvePath(target, sandboxRef.current.getRoot());
      if (!existsSync(abs)) {
        try {
          mkdirSync(abs, { recursive: true });
          addLine({ kind: 'info', text: `Created and switched to ${abs}` });
        } catch (e) {
          addLine({ kind: 'error', text: `Could not create ${abs}: ${(e as Error).message}` });
          return;
        }
      } else {
        addLine({ kind: 'info', text: `Switched to ${abs}` });
      }
      sandboxRef.current.setRoot(abs);
      storeRef.current = new SessionStore(abs);
      historyRef.current[0] = { role: 'system', content: systemPrompt(abs) };
      setStatus('');
    },
    runAgent: (args) => {
      const [name, ...rest] = args.trim().split(/\s+/);
      const task = rest.join(' ');
      if (!name || !task) {
        addLine({ kind: 'info', text: 'Usage: /agents <name> <task>' });
        return;
      }
      void runSubagentTask(name, task);
    },
    showHistory: (args) => {
      const id = args.trim();
      if (id) {
        const rec = storeRef.current.resume(id);
        if (!rec) {
          addLine({ kind: 'error', text: `No session "${id}".` });
          return;
        }
        historyRef.current = [
          { role: 'system', content: systemPrompt(sandboxRef.current.getRoot()) },
          ...rec.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
        ];
        addLine({ kind: 'info', text: `Resumed session "${rec.title}" (${rec.messages.length} messages).` });
        return;
      }
      const sessions = storeRef.current.listSessions();
      if (sessions.length === 0) {
        addLine({ kind: 'info', text: 'No past sessions in this project yet.' });
        return;
      }
      const list = sessions
        .slice(0, 10)
        .map((s) => `  ${s.id}  ${relativeTime(s.updatedAt).padEnd(9)} ${s.title}`)
        .join('\n');
      addLine({ kind: 'info', text: `Past sessions (use /resume <id>):\n${list}` });
    },
    undo: () => {
      const change = storeRef.current.popChange();
      if (!change) {
        addLine({ kind: 'info', text: 'Nothing to undo.' });
        return;
      }
      try {
        if (change.existedBefore && change.before !== undefined) {
          writeFileSync(change.path, change.before);
          addLine({ kind: 'info', text: `Reverted: ${change.description}` });
        } else if (!change.existedBefore) {
          if (existsSync(change.path)) rmSync(change.path);
          addLine({ kind: 'info', text: `Removed created file: ${change.path}` });
        }
      } catch (e) {
        addLine({ kind: 'error', text: `Undo failed: ${(e as Error).message}` });
      }
    },
  };

  const runSubagentTask = async (name: string, task: string): Promise<void> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    addLine({ kind: 'info', text: `⚙ Subagent "${name}" started: ${task}` });
    try {
      const executor = makeExecutor(controller.signal);
      const result = await runSubagent(client, model, name, task, sandboxRef.current.getRoot(), executor, {
        onToolResult: (_n, res) => addLine({ kind: 'tool', text: res.display, ok: res.ok }),
        signal: controller.signal,
      });
      addLine({ kind: 'info', text: `⚙ Subagent "${name}" finished:` });
      addLine({ kind: 'assistant', text: result });
    } catch (err) {
      addLine({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // ---- Submit ---------------------------------------------------------------
  const onSubmit = (value: string): void => {
    const text = value.trim();
    setInput('');
    if (!text) return;

    const parsed = parseCommand(text);
    if (parsed) {
      if (!parsed.spec) {
        addLine({ kind: 'error', text: `Unknown command. Try /help.` });
        return;
      }
      parsed.spec.handler(api, parsed.args);
      return;
    }
    void runTurn(text);
  };

  // ---- Render ---------------------------------------------------------------
  const staticItems: StaticItem[] = [
    { kind: 'banner' },
    ...lines.map((line) => ({ kind: 'line', line }) as StaticItem),
  ];

  return (
    <Box flexDirection="column">
      <Static key={staticKey} items={staticItems}>
        {(item, i) =>
          item.kind === 'banner' ? (
            <Box key={i}>{banner}</Box>
          ) : (
            <LineView key={i} line={item.line} />
          )
        }
      </Static>

      {streaming ? (
        <Box>
          <Text color={theme.secondary}>{'◆ '}</Text>
          <Text color={theme.text}>{streaming}</Text>
          <Text color={theme.secondaryBright}>▋</Text>
        </Box>
      ) : null}

      {overlay === 'model' && (
        <ModelPicker
          client={client}
          currentModel={model}
          onSelect={(id) => {
            const next = updateConfig({ model: id });
            setConfig(next);
            setOverlay('none');
            addLine({ kind: 'info', text: `Model set to ${id}.` });
          }}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'settings' && (
        <SettingsScreen
          config={config}
          onChanged={setConfig}
          onOpenModelPicker={() => setOverlay('model')}
          onLogout={() => api.logout()}
          onClose={() => setOverlay('none')}
        />
      )}

      {overlay === 'confirm' && pendingConfirm && (
        <ConfirmPrompt request={pendingConfirm} onAnswer={answerConfirm} />
      )}

      {overlay === 'none' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.muted}>
            {model} · {short(sandboxRef.current.getRoot())}
            {busy ? ' · working… (Esc to interrupt)' : ''}
          </Text>
          {busy ? (
            <Box>
              <Text color={theme.secondary}>
                <Spinner type="dots" />
              </Text>
              <Text color={theme.muted}> {status || 'Squeezing…'}</Text>
            </Box>
          ) : (
            <Box>
              <Text color={theme.primary}>❯ </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={onSubmit}
                placeholder={PLACEHOLDERS[placeholderIdx]}
              />
            </Box>
          )}
          {status && !busy ? <Text color={theme.muted}>{status}</Text> : null}
        </Box>
      )}
    </Box>
  );
}

function LineView({ line }: { line: Line }): React.JSX.Element {
  switch (line.kind) {
    case 'user':
      return (
        <Box>
          <Text color={theme.primary}>❯ </Text>
          <Text color={theme.text}>{line.text}</Text>
        </Box>
      );
    case 'assistant':
      return (
        <Box marginBottom={1}>
          <Text color={theme.secondary}>◆ </Text>
          <Text color={theme.text}>{line.text}</Text>
        </Box>
      );
    case 'tool':
      return <Text color={line.ok ? theme.success : theme.error}>{'  ' + line.text}</Text>;
    case 'error':
      return <Text color={theme.error}>{'✗ ' + line.text}</Text>;
    case 'info':
    default:
      return <Text color={theme.muted}>{line.text}</Text>;
  }
}

function short(p: string, max = 40): string {
  return p.length <= max ? p : '…' + p.slice(p.length - max + 1);
}

function summarize(text: string): string {
  const first = text.split('\n')[0];
  return first.length > 40 ? first.slice(0, 40) + '…' : first;
}

function resolvePath(target: string, root: string): string {
  return isAbsolute(target) ? resolvePathAbs(target) : resolvePathAbs(root, target);
}
