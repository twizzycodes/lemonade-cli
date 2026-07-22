# Contributing to Lemonade

Thanks for your interest in improving Lemonade! 🍋

## Getting set up

```bash
git clone https://github.com/lemonade-cli/lemonade
cd lemonade
npm install
npm run build
npm test
```

- **Node 20+** is required.
- Source lives in `src/` (TypeScript + [Ink](https://github.com/vadimdemedes/ink)).
- Tests live in `test/` and run with [vitest](https://vitest.dev).

## Project layout

| Path | What's there |
| --- | --- |
| `src/cli.tsx` | Entry point + CLI flag parsing (commander). |
| `src/components/` | Ink UI: setup, welcome, REPL, model picker, settings. |
| `src/agent/` | Tool-calling loop, tool implementations, sandbox, command-safety. |
| `src/openrouter/` | OpenRouter/OpenAI-compatible client (validate, models, streaming). |
| `src/commands/registry.ts` | **Single source of truth** for slash commands. |
| `src/config/` | `~/.lemonade/config.json` read/write + key masking. |
| `src/session/` | Per-project activity log, session transcripts, undo stack. |

## Adding a slash command

Add **one** entry to `commands` in `src/commands/registry.ts` (spec + handler).
`/help` is generated from that array, so your command shows up automatically —
please don't maintain a separate hand-written list.

## Before you open a PR

```bash
npm run typecheck   # tsc --noEmit, must pass
npm test            # all tests green
```

- Match the surrounding code style (comments explain _why_, not _what_).
- Add or update tests for behavior changes — especially in `src/agent/` and
  `src/openrouter/`.
- **Never commit an API key.** `.gitignore` already excludes `.lemonade/` and
  `.env`; double-check your diff.

## Reporting bugs

Open an issue with your OS, Node version, the model you were using, and steps to
reproduce. Redact any keys from logs.
