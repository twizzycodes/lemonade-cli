import { join } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';

/**
 * Per-project persistence, stored in a `.lemonade/` folder at the project root.
 * Mirrors Claude Code's "project memory": recent activity, resumable session
 * transcripts, and an undo stack of file changes.
 */

export interface ActivityEntry {
  at: number;
  summary: string;
}

export interface StoredMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  at: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  updatedAt: number;
  title: string;
  messages: StoredMessage[];
}

/** A single reversible file change for the /undo stack. */
export interface FileChange {
  at: number;
  path: string;
  /** Whether the file existed before the change (false = we created it). */
  existedBefore: boolean;
  /** File contents before the change (undefined if it didn't exist). */
  before?: string;
  /** File contents after the change (undefined if we deleted it). */
  after?: string;
  description: string;
}

export class SessionStore {
  private dir: string;
  private sessionsDir: string;
  private activityPath: string;
  private undoPath: string;
  private current: SessionRecord;

  constructor(projectRoot: string) {
    this.dir = join(projectRoot, '.lemonade');
    this.sessionsDir = join(this.dir, 'sessions');
    this.activityPath = join(this.dir, 'activity.json');
    this.undoPath = join(this.dir, 'undo.json');
    this.current = {
      id: `${Date.now()}`,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      title: 'Fresh session',
      messages: [],
    };
  }

  private ensureDirs(): void {
    if (!existsSync(this.sessionsDir)) mkdirSync(this.sessionsDir, { recursive: true });
  }

  private readJson<T>(path: string, fallback: T): T {
    try {
      if (!existsSync(path)) return fallback;
      return JSON.parse(readFileSync(path, 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  // ---- Activity feed (Recent activity panel) --------------------------------

  recentActivity(limit = 4): ActivityEntry[] {
    const all = this.readJson<ActivityEntry[]>(this.activityPath, []);
    return all.slice(-limit).reverse();
  }

  logActivity(summary: string): void {
    this.ensureDirs();
    const all = this.readJson<ActivityEntry[]>(this.activityPath, []);
    all.push({ at: Date.now(), summary });
    // Keep the file from growing unbounded.
    writeFileSync(this.activityPath, JSON.stringify(all.slice(-100), null, 2));
  }

  // ---- Session transcripts (/history, /resume, /clear) ----------------------

  currentSession(): SessionRecord {
    return this.current;
  }

  addMessage(msg: StoredMessage): void {
    this.current.messages.push(msg);
    this.current.updatedAt = Date.now();
    if (this.current.title === 'Fresh session' && msg.role === 'user') {
      this.current.title = msg.content.slice(0, 48);
    }
  }

  saveSession(): void {
    if (this.current.messages.length === 0) return;
    this.ensureDirs();
    writeFileSync(
      join(this.sessionsDir, `${this.current.id}.json`),
      JSON.stringify(this.current, null, 2),
    );
  }

  listSessions(): SessionRecord[] {
    if (!existsSync(this.sessionsDir)) return [];
    return readdirSync(this.sessionsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => this.readJson<SessionRecord | null>(join(this.sessionsDir, f), null))
      .filter((s): s is SessionRecord => s !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  resume(id: string): SessionRecord | undefined {
    const path = join(this.sessionsDir, `${id}.json`);
    const rec = this.readJson<SessionRecord | null>(path, null);
    if (rec) this.current = rec;
    return rec ?? undefined;
  }

  clearCurrent(): void {
    this.current = {
      id: `${Date.now()}`,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      title: 'Fresh session',
      messages: [],
    };
  }

  // ---- Undo stack -----------------------------------------------------------

  pushChange(change: FileChange): void {
    this.ensureDirs();
    const stack = this.readJson<FileChange[]>(this.undoPath, []);
    stack.push(change);
    writeFileSync(this.undoPath, JSON.stringify(stack.slice(-200), null, 2));
  }

  popChange(): FileChange | undefined {
    const stack = this.readJson<FileChange[]>(this.undoPath, []);
    const last = stack.pop();
    writeFileSync(this.undoPath, JSON.stringify(stack, null, 2));
    return last;
  }
}
