/**
 * Heuristics for classifying shell commands by risk.
 *
 * - read-only commands can auto-run;
 * - "write" commands (the default) need confirmation unless auto-approve is on;
 * - "destructive" commands ALWAYS need confirmation and are blocked entirely
 *   unless the user explicitly passed --dangerously-skip-confirmations.
 */
export type CommandRisk = 'readonly' | 'write' | 'destructive';

const READONLY_LEADERS = new Set([
  'ls', 'dir', 'pwd', 'cat', 'less', 'more', 'head', 'tail', 'echo', 'grep',
  'rg', 'find', 'which', 'whoami', 'date', 'env', 'printenv', 'wc', 'stat',
  'tree', 'du', 'df', 'ps', 'top', 'node', 'type', 'file', 'git',
]);

const READONLY_GIT_SUBCOMMANDS = new Set([
  'status', 'log', 'diff', 'show', 'branch', 'remote', 'config', 'rev-parse',
]);

/** Patterns that are dangerous regardless of context. */
const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /\brm\s+-[a-z]*[rf]/i, // rm -rf, rm -f, etc.
  /\brmdir\b/i,
  /\bdel\b|\berase\b/i, // Windows delete
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\b/i,
  /:\(\)\s*\{.*\}/, // fork bomb-ish
  /\bshutdown\b|\breboot\b|\bhalt\b/i,
  /git\s+push\s+.*--force|git\s+push\s+.*-f\b/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-[a-z]*f/i,
  />\s*\/dev\/sd/i,
  /\bchmod\s+-R\b/i,
  /\bsudo\b/i,
  /\bnpm\s+publish\b|\byarn\s+publish\b/i,
  /\bcurl\b.*\|\s*(sh|bash)\b/i, // pipe-to-shell
  /\bwget\b.*\|\s*(sh|bash)\b/i,
];

export function classifyCommand(cmd: string): CommandRisk {
  const trimmed = cmd.trim();
  for (const pat of DESTRUCTIVE_PATTERNS) {
    if (pat.test(trimmed)) return 'destructive';
  }

  // If the command chains multiple statements, be conservative: classify by the
  // riskiest leader.
  const segments = trimmed.split(/&&|\|\||;|\|/).map((s) => s.trim());
  let risk: CommandRisk = 'readonly';
  for (const seg of segments) {
    const tokens = seg.split(/\s+/);
    const leader = tokens[0] ?? '';
    if (!READONLY_LEADERS.has(leader)) {
      risk = 'write';
      continue;
    }
    if (leader === 'git') {
      const sub = tokens[1] ?? '';
      if (!READONLY_GIT_SUBCOMMANDS.has(sub)) risk = 'write';
    }
  }
  return risk;
}

export function isDestructive(cmd: string): boolean {
  return classifyCommand(cmd) === 'destructive';
}
