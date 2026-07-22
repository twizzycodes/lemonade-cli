#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { App } from './components/App.js';
import { loadConfig } from './config/config.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
function readVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
        return pkg.version ?? '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
const program = new Command();
program
    .name('lemonade')
    .description('Lemonade — an open-source, model-agnostic AI coding CLI powered by OpenRouter.')
    .version(readVersion(), '-v, --version')
    .argument('[directory]', 'directory to operate in (defaults to the current directory)')
    .option('-y, --yes', 'auto-approve non-destructive tool calls (like CI)', false)
    .option('--dangerously-skip-confirmations', 'skip ALL confirmations, including destructive commands (use with care)', false)
    .option('--no-animations', 'disable startup and streaming animations')
    .action((directory, opts) => {
    const cwd = resolve(directory ?? process.cwd());
    const cfg = loadConfig();
    const animations = opts.animations !== false && cfg.animations !== false;
    // Start on a clean screen: clear the viewport (2J), wipe the scrollback
    // buffer (3J), and home the cursor (H). Only when attached to a real
    // terminal, so piped/redirected output stays free of escape codes.
    if (process.stdout.isTTY) {
        process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    }
    // Ink owns the alternate screen; make sure Ctrl+C is handled inside the app.
    render(React.createElement(App, {
        version: readVersion(),
        cwd,
        autoApprove: Boolean(opts.yes),
        dangerouslySkip: Boolean(opts.dangerouslySkipConfirmations),
        animations,
    }), { exitOnCtrlC: false });
});
program.parseAsync(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map