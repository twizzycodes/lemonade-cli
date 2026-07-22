export const commands = [
    {
        name: 'help',
        summary: 'List all available commands.',
        handler: (api) => api.showHelp(),
    },
    {
        name: 'settings',
        summary: 'View or change username, API key, default model, and toggles.',
        handler: (api) => api.openSettings(),
    },
    {
        name: 'model',
        summary: 'List and switch the active OpenRouter model.',
        handler: (api) => api.openModelPicker(),
    },
    {
        name: 'init',
        summary: 'Scaffold a new project in the current directory.',
        usage: '/init [description]',
        handler: (api, args) => api.initProject(args),
    },
    {
        name: 'folder',
        aliases: ['cd'],
        summary: 'Change the directory Lemonade operates in.',
        usage: '/folder <path>',
        handler: (api, args) => api.changeFolder(args),
    },
    {
        name: 'agents',
        aliases: ['agent'],
        summary: 'Spin up a named subagent for a scoped task.',
        usage: '/agents <name> <task>',
        handler: (api, args) => api.runAgent(args),
    },
    {
        name: 'history',
        aliases: ['resume'],
        summary: 'Show or resume past sessions in this project.',
        usage: '/history [session-id]',
        handler: (api, args) => api.showHistory(args),
    },
    {
        name: 'clear',
        summary: 'Clear the screen and conversation context (files untouched).',
        handler: (api) => api.clearContext(),
    },
    {
        name: 'undo',
        summary: 'Revert the last file change Lemonade made.',
        handler: (api) => api.undo(),
    },
    {
        name: 'logout',
        summary: 'Clear the saved API key and return to login next launch.',
        handler: (api) => api.logout(),
    },
];
/** Look up a command by name or alias (case-insensitive, no leading slash). */
export function findCommand(name) {
    const key = name.replace(/^\//, '').toLowerCase();
    return commands.find((c) => c.name === key || c.aliases?.includes(key));
}
/** Parse a raw "/name rest of args" input into a command + args. */
export function parseCommand(input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/'))
        return null;
    const [head, ...rest] = trimmed.slice(1).split(/\s+/);
    return { spec: findCommand(head), args: rest.join(' ') };
}
/** Render the dynamic help listing shown by /help. */
export function formatHelp() {
    const width = Math.max(...commands.map((c) => `/${c.name}${c.aliases ? ` (/${c.aliases.join(', /')})` : ''}`.length));
    const lines = commands.map((c) => {
        const label = `/${c.name}${c.aliases ? ` (/${c.aliases.join(', /')})` : ''}`;
        return `  ${label.padEnd(width + 2)}${c.summary}`;
    });
    return ['Available commands:', ...lines].join('\n');
}
//# sourceMappingURL=registry.js.map