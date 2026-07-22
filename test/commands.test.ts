import { describe, it, expect } from 'vitest';
import { commands, findCommand, parseCommand, formatHelp } from '../src/commands/registry.js';
import { maskKey } from '../src/config/config.js';

describe('command registry', () => {
  it('finds commands by name and alias', () => {
    expect(findCommand('help')?.name).toBe('help');
    expect(findCommand('/model')?.name).toBe('model');
    expect(findCommand('cd')?.name).toBe('folder');
    expect(findCommand('resume')?.name).toBe('history');
    expect(findCommand('nope')).toBeUndefined();
  });

  it('parses slash input into command + args', () => {
    const p = parseCommand('/folder ./project');
    expect(p?.spec?.name).toBe('folder');
    expect(p?.args).toBe('./project');
    expect(parseCommand('not a command')).toBeNull();
  });

  it('help lists every registered command (single source of truth)', () => {
    const help = formatHelp();
    for (const c of commands) {
      expect(help).toContain(`/${c.name}`);
    }
  });
});

describe('maskKey', () => {
  it('never reveals the full key', () => {
    const key = 'sk-or-v1-abcdefghijklmnop1234';
    const masked = maskKey(key);
    expect(masked).toBe('sk-or-...1234');
    expect(masked).not.toContain('abcdefgh');
  });

  it('handles missing keys', () => {
    expect(maskKey(undefined)).toBe('(none)');
  });
});
