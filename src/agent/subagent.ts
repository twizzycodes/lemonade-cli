import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenRouterClient } from '../openrouter/client.js';
import { ToolExecutor } from './tools.js';
import { runAgent, type AgentHandlers } from './loop.js';

/**
 * Run a scoped, named subagent in its own fresh tool loop. It shares the same
 * tools/sandbox as the main agent but starts from a clean transcript with a
 * role-specific system prompt, then reports its result back.
 */
export async function runSubagent(
  client: OpenRouterClient,
  model: string,
  name: string,
  task: string,
  cwd: string,
  executor: ToolExecutor,
  handlers: AgentHandlers = {},
): Promise<string> {
  const history: ChatCompletionMessageParam[] = [
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
