import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { classifyCommand } from './safety.js';
/** OpenAI-format tool schemas advertised to the model. */
export const toolDefinitions = [
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the full contents of a text file, relative to the working directory.',
            parameters: {
                type: 'object',
                properties: { path: { type: 'string', description: 'Path to the file.' } },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: 'Create a new file or overwrite an existing one with the given content. Parent directories are created as needed.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    content: { type: 'string' },
                },
                required: ['path', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'edit_file',
            description: 'Replace an exact, unique substring in a file. old_str must match exactly once, or the edit is rejected. Prefer this over write_file for small changes.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    old_str: { type: 'string', description: 'Exact text to find (must be unique).' },
                    new_str: { type: 'string', description: 'Replacement text.' },
                },
                required: ['path', 'old_str', 'new_str'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List the entries of a directory relative to the working directory.',
            parameters: {
                type: 'object',
                properties: { path: { type: 'string', description: 'Defaults to ".".' } },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a shell command in the working directory and return its combined stdout/stderr. Read-only commands run immediately; others require user confirmation.',
            parameters: {
                type: 'object',
                properties: { cmd: { type: 'string' } },
                required: ['cmd'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_files',
            description: 'Search file contents recursively for a regular expression (ripgrep-style). Returns matching path:line: text lines.',
            parameters: {
                type: 'object',
                properties: {
                    pattern: { type: 'string' },
                    path: { type: 'string', description: 'Directory to search. Defaults to ".".' },
                },
                required: ['pattern'],
            },
        },
    },
];
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.lemonade', '.next', 'build']);
const MAX_SEARCH_RESULTS = 200;
export class ToolExecutor {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    async execute(name, rawArgs) {
        let args;
        try {
            args = rawArgs ? JSON.parse(rawArgs) : {};
        }
        catch {
            return { ok: false, output: `Invalid JSON arguments: ${rawArgs}`, display: `✗ ${name} (bad args)` };
        }
        try {
            switch (name) {
                case 'read_file':
                    return this.readFile(String(args.path ?? ''));
                case 'write_file':
                    return await this.writeFile(String(args.path ?? ''), String(args.content ?? ''));
                case 'edit_file':
                    return await this.editFile(String(args.path ?? ''), String(args.old_str ?? ''), String(args.new_str ?? ''));
                case 'list_directory':
                    return this.listDirectory(String(args.path ?? '.'));
                case 'run_command':
                    return await this.runCommand(String(args.cmd ?? ''));
                case 'search_files':
                    return this.searchFiles(String(args.pattern ?? ''), String(args.path ?? '.'));
                default:
                    return { ok: false, output: `Unknown tool: ${name}`, display: `✗ Unknown tool ${name}` };
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, output: `Error: ${msg}`, display: `✗ ${name}: ${msg}` };
        }
    }
    readFile(path) {
        const abs = this.ctx.sandbox.resolveInside(path);
        if (!existsSync(abs)) {
            return { ok: false, output: `File not found: ${path}`, display: `✗ read ${path} (not found)` };
        }
        const content = readFileSync(abs, 'utf8');
        return { ok: true, output: content, display: `☰ Read ${this.ctx.sandbox.displayPath(abs)}` };
    }
    async writeFile(path, content) {
        const abs = this.ctx.sandbox.resolveInside(path);
        const existedBefore = existsSync(abs);
        const before = existedBefore ? readFileSync(abs, 'utf8') : undefined;
        if (!this.ctx.autoApprove && !this.ctx.dangerouslySkip) {
            const ok = await this.ctx.confirm({
                kind: 'write',
                risk: 'write',
                title: existedBefore ? `Overwrite ${path}?` : `Create ${path}?`,
                detail: preview(content),
            });
            if (!ok)
                return { ok: false, output: 'User declined the file write.', display: `✗ write ${path} (declined)` };
        }
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content);
        this.ctx.store.pushChange({
            at: Date.now(),
            path: abs,
            existedBefore,
            before,
            after: content,
            description: existedBefore ? `Overwrote ${path}` : `Created ${path}`,
        });
        const verb = existedBefore ? 'Wrote' : 'Created';
        return {
            ok: true,
            output: `${verb} ${path} (${content.length} bytes).`,
            display: `✎ ${verb} ${this.ctx.sandbox.displayPath(abs)}`,
        };
    }
    async editFile(path, oldStr, newStr) {
        const abs = this.ctx.sandbox.resolveInside(path);
        if (!existsSync(abs)) {
            return { ok: false, output: `File not found: ${path}`, display: `✗ edit ${path} (not found)` };
        }
        const before = readFileSync(abs, 'utf8');
        const occurrences = before.split(oldStr).length - 1;
        if (occurrences === 0) {
            return { ok: false, output: `old_str not found in ${path}.`, display: `✗ edit ${path} (no match)` };
        }
        if (occurrences > 1) {
            return {
                ok: false,
                output: `old_str matched ${occurrences} times in ${path}; it must be unique. Add surrounding context.`,
                display: `✗ edit ${path} (${occurrences} matches)`,
            };
        }
        const after = before.replace(oldStr, newStr);
        if (!this.ctx.autoApprove && !this.ctx.dangerouslySkip) {
            const ok = await this.ctx.confirm({
                kind: 'write',
                risk: 'write',
                title: `Edit ${path}?`,
                detail: diffPreview(oldStr, newStr),
            });
            if (!ok)
                return { ok: false, output: 'User declined the edit.', display: `✗ edit ${path} (declined)` };
        }
        writeFileSync(abs, after);
        this.ctx.store.pushChange({
            at: Date.now(),
            path: abs,
            existedBefore: true,
            before,
            after,
            description: `Edited ${path}`,
        });
        return { ok: true, output: `Edited ${path}.`, display: `✎ Edited ${this.ctx.sandbox.displayPath(abs)}` };
    }
    listDirectory(path) {
        const abs = this.ctx.sandbox.resolveInside(path);
        if (!existsSync(abs)) {
            return { ok: false, output: `Directory not found: ${path}`, display: `✗ ls ${path} (not found)` };
        }
        const entries = readdirSync(abs, { withFileTypes: true })
            .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
            .sort();
        return {
            ok: true,
            output: entries.length ? entries.join('\n') : '(empty directory)',
            display: `☰ Listed ${this.ctx.sandbox.displayPath(abs)} (${entries.length})`,
        };
    }
    async runCommand(cmd) {
        if (!cmd.trim())
            return { ok: false, output: 'Empty command.', display: '✗ run (empty)' };
        const risk = classifyCommand(cmd);
        if (risk === 'destructive') {
            if (!this.ctx.dangerouslySkip) {
                const ok = await this.ctx.confirm({
                    kind: 'command',
                    risk,
                    title: `⚠ Potentially destructive command`,
                    detail: cmd,
                });
                if (!ok)
                    return { ok: false, output: 'User declined the command.', display: `✗ run (declined): ${cmd}` };
            }
        }
        else if (risk === 'write') {
            if (!this.ctx.autoApprove && !this.ctx.dangerouslySkip) {
                const ok = await this.ctx.confirm({ kind: 'command', risk, title: `Run command?`, detail: cmd });
                if (!ok)
                    return { ok: false, output: 'User declined the command.', display: `✗ run (declined): ${cmd}` };
            }
        }
        this.ctx.onProgress?.(`▶ Running: ${cmd}`);
        const { code, output } = await execShell(cmd, this.ctx.sandbox.getRoot(), this.ctx.signal);
        const ok = code === 0;
        const trimmed = output.length > 20000 ? output.slice(0, 20000) + '\n…(truncated)' : output;
        return {
            ok,
            output: `exit code ${code}\n${trimmed}`,
            display: `${ok ? '▶' : '✗'} ${cmd} (exit ${code})`,
        };
    }
    searchFiles(pattern, path) {
        let regex;
        try {
            regex = new RegExp(pattern);
        }
        catch (err) {
            return { ok: false, output: `Invalid regex: ${err.message}`, display: `✗ search (bad regex)` };
        }
        const root = this.ctx.sandbox.resolveInside(path);
        const results = [];
        const walk = (dir) => {
            if (results.length >= MAX_SEARCH_RESULTS)
                return;
            let entries;
            try {
                entries = readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                if (results.length >= MAX_SEARCH_RESULTS)
                    return;
                if (entry.name.startsWith('.') && entry.name !== '.') {
                    if (IGNORED_DIRS.has(entry.name))
                        continue;
                }
                const full = join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (IGNORED_DIRS.has(entry.name))
                        continue;
                    walk(full);
                }
                else if (entry.isFile()) {
                    let content;
                    try {
                        const st = statSync(full);
                        if (st.size > 1_000_000)
                            continue; // skip big/binary files
                        content = readFileSync(full, 'utf8');
                    }
                    catch {
                        continue;
                    }
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i])) {
                            results.push(`${this.ctx.sandbox.displayPath(full)}:${i + 1}: ${lines[i].trim()}`);
                            if (results.length >= MAX_SEARCH_RESULTS)
                                break;
                        }
                    }
                }
            }
        };
        walk(root);
        return {
            ok: true,
            output: results.length ? results.join('\n') : 'No matches.',
            display: `⚲ Searched "${pattern}" (${results.length} hits)`,
        };
    }
}
function preview(text, lines = 12) {
    const split = text.split('\n');
    const shown = split.slice(0, lines).join('\n');
    return split.length > lines ? `${shown}\n…(+${split.length - lines} more lines)` : shown;
}
function diffPreview(oldStr, newStr) {
    const minus = oldStr.split('\n').map((l) => `- ${l}`).join('\n');
    const plus = newStr.split('\n').map((l) => `+ ${l}`).join('\n');
    return `${minus}\n${plus}`;
}
/** Run a command through the platform shell, capturing combined output. */
export function execShell(cmd, cwd, signal) {
    return new Promise((resolve) => {
        const isWin = process.platform === 'win32';
        const shell = isWin ? 'cmd.exe' : '/bin/sh';
        const shellArgs = isWin ? ['/c', cmd] : ['-c', cmd];
        const child = spawn(shell, shellArgs, { cwd });
        let output = '';
        let settled = false;
        const finish = (code) => {
            if (settled)
                return;
            settled = true;
            if (signal)
                signal.removeEventListener('abort', onAbort);
            resolve({ code, output });
        };
        const onAbort = () => {
            child.kill('SIGTERM');
            output += '\n(interrupted by user)';
            finish(130);
        };
        if (signal) {
            if (signal.aborted)
                return onAbort();
            signal.addEventListener('abort', onAbort);
        }
        child.stdout.on('data', (d) => (output += d.toString()));
        child.stderr.on('data', (d) => (output += d.toString()));
        child.on('error', (err) => {
            output += `\n${err.message}`;
            finish(1);
        });
        child.on('close', (code) => finish(code ?? 0));
    });
}
//# sourceMappingURL=tools.js.map