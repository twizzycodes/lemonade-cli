import { runAgent } from './loop.js';
/**
 * Run a scoped, named subagent in its own fresh tool loop. It shares the same
 * tools/sandbox as the main agent but starts from a clean transcript with a
 * role-specific system prompt, then reports its result back.
 */
export async function runSubagent(client, model, name, task, cwd, executor, handlers = {}) {
    const history = [
        {
            role: 'system',
            content: [
                `You are a focused subagent named "${name}".`,
                `Working directory: ${cwd}.`,
                'You have the same file and shell tools as the main assistant.',
                'Complete only the scoped task you are given, then report a concise result.',
                'Do not ask follow-up questions; make reasonable assumptions and proceed.',
            ].join('\n'),
        },
        { role: 'user', content: task },
    ];
    const result = await runAgent(client, model, history, executor, handlers);
    return result.finalText;
}
//# sourceMappingURL=subagent.js.map