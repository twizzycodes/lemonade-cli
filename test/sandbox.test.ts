import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Sandbox } from '../src/agent/sandbox.js';

describe('Sandbox', () => {
  const root = resolve('/tmp/lemonade-root');
  const box = new Sandbox(root);

  it('resolves relative paths inside the root', () => {
    expect(box.resolveInside('src/app.ts')).toBe(resolve(root, 'src/app.ts'));
    expect(box.resolveInside('.')).toBe(root);
  });

  it('rejects paths that escape the root', () => {
    expect(() => box.resolveInside('../secrets.txt')).toThrow(/outside/);
    expect(() => box.resolveInside('../../etc/passwd')).toThrow(/outside/);
  });

  it('produces tidy display paths', () => {
    expect(box.displayPath(resolve(root, 'src/x.ts'))).toBe('src/x.ts');
    expect(box.displayPath(root)).toBe('.');
  });

  it('follows setRoot', () => {
    const b = new Sandbox(root);
    const next = resolve('/tmp/other');
    b.setRoot(next);
    expect(b.getRoot()).toBe(next);
    expect(b.resolveInside('a.txt')).toBe(resolve(next, 'a.txt'));
  });
});
