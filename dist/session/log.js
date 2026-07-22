import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, } from 'node:fs';
export class SessionStore {
    dir;
    sessionsDir;
    activityPath;
    undoPath;
    current;
    constructor(projectRoot) {
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
    ensureDirs() {
        if (!existsSync(this.sessionsDir))
            mkdirSync(this.sessionsDir, { recursive: true });
    }
    readJson(path, fallback) {
        try {
            if (!existsSync(path))
                return fallback;
            return JSON.parse(readFileSync(path, 'utf8'));
        }
        catch {
            return fallback;
        }
    }
    // ---- Activity feed (Recent activity panel) --------------------------------
    recentActivity(limit = 4) {
        const all = this.readJson(this.activityPath, []);
        return all.slice(-limit).reverse();
    }
    logActivity(summary) {
        this.ensureDirs();
        const all = this.readJson(this.activityPath, []);
        all.push({ at: Date.now(), summary });
        // Keep the file from growing unbounded.
        writeFileSync(this.activityPath, JSON.stringify(all.slice(-100), null, 2));
    }
    // ---- Session transcripts (/history, /resume, /clear) ----------------------
    currentSession() {
        return this.current;
    }
    addMessage(msg) {
        this.current.messages.push(msg);
        this.current.updatedAt = Date.now();
        if (this.current.title === 'Fresh session' && msg.role === 'user') {
            this.current.title = msg.content.slice(0, 48);
        }
    }
    saveSession() {
        if (this.current.messages.length === 0)
            return;
        this.ensureDirs();
        writeFileSync(join(this.sessionsDir, `${this.current.id}.json`), JSON.stringify(this.current, null, 2));
    }
    listSessions() {
        if (!existsSync(this.sessionsDir))
            return [];
        return readdirSync(this.sessionsDir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => this.readJson(join(this.sessionsDir, f), null))
            .filter((s) => s !== null)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    resume(id) {
        const path = join(this.sessionsDir, `${id}.json`);
        const rec = this.readJson(path, null);
        if (rec)
            this.current = rec;
        return rec ?? undefined;
    }
    clearCurrent() {
        this.current = {
            id: `${Date.now()}`,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            title: 'Fresh session',
            messages: [],
        };
    }
    // ---- Undo stack -----------------------------------------------------------
    pushChange(change) {
        this.ensureDirs();
        const stack = this.readJson(this.undoPath, []);
        stack.push(change);
        writeFileSync(this.undoPath, JSON.stringify(stack.slice(-200), null, 2));
    }
    popChange() {
        const stack = this.readJson(this.undoPath, []);
        const last = stack.pop();
        writeFileSync(this.undoPath, JSON.stringify(stack, null, 2));
        return last;
    }
}
//# sourceMappingURL=log.js.map