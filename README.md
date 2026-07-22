# 🍋 Lemonade

**An open-source, model-agnostic AI coding CLI.** Lemonade is a Claude Code–style
agentic terminal assistant that runs against **any model on
[OpenRouter](https://openrouter.ai)** — pick whichever model you have credits or
access for. Point it at an API key, describe what you want, and it plans, writes
files, runs commands, and iterates until your project runs. All wrapped in a warm
citrus terminal UI.

<p align="center">
  <img src="https://i.imgur.com/9WmIntL.png" width="600" alt="Lemonade">
</p>


---

## Quick start

```bash
# Run it without installing
npx lemonade-code

# …or install globally (the command is `lemonade`)
npm install -g lemonade-code
lemonade
```

Requires **Node.js 20+**.

## Logging in

The **first time** you run `lemonade`, it skips straight to a short setup instead
of the normal welcome screen:

1. **Your name** — what Lemonade should call you (defaults to your OS username).
2. **Your OpenRouter API key** — paste it in, or press **Enter** on an empty line
   to open <https://openrouter.ai/keys> in your browser, grab a key, and paste it
   back. Lemonade validates the key live before saving it.

That's it — no separate setup command. Your name and key are saved to
`~/.lemonade/config.json` (the key is masked as `sk-or-...ab12` anywhere it's
shown, and never printed in full).

Change them any time:

- `/settings` — update your name, **rotate your API key**, set the default model,
  toggle auto-approve or animations, and view your OpenRouter credit balance.
- `/logout` — clear the saved key and return to the login screen on next launch.

You can also inject a key without saving it (handy for CI):

```bash
LEMONADE_API_KEY=sk-or-... lemonade --yes "run the test suite"
```

## Example usage

```bash
lemonade
# log in once, then just talk to it:

> build a REST API for a bookstore with Express and SQLite
> add a /books/:id endpoint with tests
> /model            # switch to a cheaper or free model
> /folder ./api     # cd into a subproject
> npm test           # ask it to run and fix failing tests
```

Lemonade will read and search your files, propose writes and edits (showing you a
diff), run commands (asking before anything that isn't read-only), and narrate
each step — just like a pair programmer.

## Slash commands

`/help` is the source of truth and lists everything dynamically. The core set:

| Command | Description |
| --- | --- |
| `/help` | List all available commands. |
| `/settings` | Change username, rotate API key, set default model, toggle auto-approve/animations, view credits. |
| `/model` | List and switch the active OpenRouter model (free vs. paid, context length, pricing). |
| `/init` | Scaffold a new project in the current directory. |
| `/folder` (`/cd`) | Change the directory Lemonade operates in (creates it if missing). |
| `/agents` | Spin up a named subagent for a scoped task, e.g. `/agents reviewer check src/ for bugs`. |
| `/history` (`/resume`) | Show or resume past sessions in this project. |
| `/clear` | Clear the current conversation context (files untouched). |
| `/undo` | Revert the last file change Lemonade made. |
| `/logout` | Clear the saved API key. |

**Keyboard:** `Esc` or `Ctrl+B` interrupts a running task · `Ctrl+C` twice exits.

<p align="center">
  <img src="https://i.imgur.com/9KZYbZY.gif" width="600" alt="Example">
</p>

## Command-line flags

| Flag | Meaning |
| --- | --- |
| `[directory]` | Directory to operate in (defaults to the current directory). |
| `-y, --yes` | Auto-approve non-destructive tool calls (for CI/trusted use). |
| `--dangerously-skip-confirmations` | Skip **all** confirmations, including destructive commands. Opt-in and loud on purpose. |
| `--no-animations` | Disable startup/streaming animations (nice over slow SSH). |
| `-v, --version` | Print the version. |

Even with `--yes`, genuinely destructive commands (`rm -rf`, force pushes, disk
formatting, `sudo`, pipe-to-shell, …) still require confirmation — only
`--dangerously-skip-confirmations` bypasses them.

## Models & free tier

Lemonade works with **any** model OpenRouter exposes — it never hardcodes a model
roster. Browse the full, always-current list at
<https://openrouter.ai/models>, or run `/model` to pick one interactively (it
labels free vs. paid, shows context length and pricing, and lets you filter, e.g.
type `free` or `claude`).

Free models (the `:free` suffix) are labeled `[free]`. They have tighter rate
limits; when you hit one, Lemonade retries with backoff and, if it still fails,
shows a clear message pointing you to switch models or check your dashboard.

<p align="center">
  <img src="https://i.imgur.com/h83UN9q.gif" width="600" alt="Lemonade">
</p>

## Other OpenAI-compatible endpoints

OpenRouter is the default, but Lemonade talks the OpenAI chat-completions
protocol, so it also works with self-hosted endpoints like **Ollama** or
**LM Studio**. Set a `baseUrl` in `~/.lemonade/config.json` (or the
`LEMONADE_BASE_URL` env var):

```json
{ "baseUrl": "http://localhost:11434/v1", "model": "llama3" }
```

## How it works

Lemonade runs a standard agent loop: it sends your message plus tool definitions
to the model, executes any tool calls locally, feeds results back, and repeats
until the model returns a final answer.

**Tools:** `read_file`, `write_file`, `edit_file` (unique-match, diff-previewed),
`list_directory`, `run_command` (risk-classified), and `search_files`
(ripgrep-style). All file and shell operations are **sandboxed to the working
directory** by default. Every change is logged so `/undo` and `/history` work.

## Development

```bash
git clone https://github.com/lemonade-cli
cd lemonade
npm install
npm run build       # compile TypeScript to dist/
npm test            # run the vitest suite
npm run dev         # tsc --watch
node dist/cli.js    # run your local build
```

The repo ships **zero** API keys — `.gitignore` excludes `.lemonade/` and `.env`.
Never commit a real key.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) and our

## License

[LICENSE](LICENSE)© Lemonade.
