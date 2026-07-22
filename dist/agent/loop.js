import { toolDefinitions } from './tools.js';
import { withRetry, friendlyError } from '../utils/retry.js';
const MAX_ITERATIONS = 25;
/**
 * The core agent loop: send history to the model, execute any tool calls it
 * returns, feed the results back, and repeat until it produces a final text
 * answer (or hits the iteration cap).
 *
 * `history` is mutated in place so the caller can persist the full transcript.
 */
export async function runAgent(client, model, history, executor, handlers = {}) {
    let toolCallCount = 0;
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        if (handlers.signal?.aborted)
            break;
        let turn;
        try {
            turn = await withRetry(() => client.streamChat(model, history, toolDefinitions, {
                onText: handlers.onText,
                signal: handlers.signal,
            }), {
                onRetry: (attempt, delay) => handlers.onRetry?.(attempt, delay),
            });
        }
        catch (err) {
            throw new Error(friendlyError(err));
        }
        // No tool calls → this is the final assistant message.
        if (turn.toolCalls.length === 0) {
            history.push({ role: 'assistant', content: turn.content });
            return { finalText: turn.content, toolCallCount };
        }
        // Record the assistant turn (with its tool calls) before executing them.
        history.push({
            role: 'assistant',
            content: turn.content || null,
            tool_calls: turn.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: { name: tc.name, arguments: tc.arguments },
            })),
        });
        for (const call of turn.toolCalls) {
            if (handlers.signal?.aborted)
                break;
            handlers.onToolStart?.(call.name, call.arguments);
            const result = await executor.execute(call.name, call.arguments);
            toolCallCount++;
            handlers.onToolResult?.(call.name, result);
            history.push({
                role: 'tool',
                tool_call_id: call.id,
                content: result.output,
            });
        }
    }
    return { finalText: '(Reached the maximum number of tool iterations.)', toolCallCount };
}
//# sourceMappingURL=loop.js.map