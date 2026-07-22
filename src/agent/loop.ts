import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenRouterClient } from '../openrouter/client.js';
import { ToolExecutor, toolDefinitions, type ToolResult } from './tools.js';
import { withRetry, friendlyError } from '../utils/retry.js';

export interface AgentHandlers {
  /** Streaming text delta from the assistant. */
  onText?: (delta: string) => void;
  /** A tool call is starting. */
  onToolStart?: (name: string, args: string) => void;
  /** A tool call finished. */
  onToolResult?: (name: string, result: ToolResult) => void;
  /** A retry occurred (rate limit / transient). */
  onRetry?: (attempt: number, delayMs: number) => void;
  signal?: AbortSignal;
}

export interface AgentRunResult {
  finalText: string;
  /** Number of tool calls executed across the run. */
  toolCallCount: number;
}

const MAX_ITERATIONS = 25;

/**
 * The core agent loop: send history to the model, execute any tool calls it
 * returns, feed the results back, and repeat until it produces a final text
 * answer (or hits the iteration cap).
 *
 * `history` is mutated in place so the caller can persist the full transcript.
 */
export async function runAgent(
  client: OpenRouterClient,
  model: string,
  history: ChatCompletionMessageParam[],
  executor: ToolExecutor,
  handlers: AgentHandlers = {},
): Promise<AgentRunResult> {
  let toolCallCount = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (handlers.signal?.aborted) break;

    let turn;
    try {
      turn = await withRetry(
        () =>
          client.streamChat(model, history, toolDefinitions, {
            onText: handlers.onText,
            signal: handlers.signal,
          }),
        {
          onRetry: (attempt, delay) => handlers.onRetry?.(attempt, delay),
        },
      );
    } catch (err) {
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
      if (handlers.signal?.aborted) break;
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
