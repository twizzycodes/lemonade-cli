import { isAbsolute, resolve, relative, sep } from 'node:path';

/**
 * Path sandboxing. By default every file/shell operation is confined to the
 * working directory Lemonade was pointed at (the "root"). This prevents a model
 * from reading or clobbering files elsewhere on the machine. `/folder` changes
 * the root; nothing else escapes it.
 */
export class Sandbox {
  private root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  getRoot(): string {
    return this.root;
  }

  setRoot(next: string): void {
    this.root = resolve(next);
  }

  /**
   * Resolve a possibly-relative path against the root and assert it stays inside
   * the sandbox. Throws if the path escapes (e.g. via `../../etc/passwd`).
   */
  resolveInside(target: string): string {
    const abs = isAbsolute(target) ? resolve(target) : resolve(this.root, target);
    if (!this.isInside(abs)) {
      throw new Error(
        `Path "${target}" is outside the working directory (${this.root}). ` +
          `Use /folder to change directories.`,
      );
    }
    return abs;
  }

  isInside(abs: string): boolean {
    const rel = relative(this.root, abs);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  }

  /** Path relative to root, for tidy display in the UI. */
  displayPath(abs: string): string {
    const rel = relative(this.root, abs);
    return rel === '' ? '.' : rel.split(sep).join('/');
  }
}
