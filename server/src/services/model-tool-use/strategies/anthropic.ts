import { toAnthropicToolChoice, toAnthropicTools } from '../format.js';
import { parseAnthropicResponse, parseErrorResponse } from '../parse.js';
import type { ModelRef, ProviderStrategy, ToolUseResult, ToolUseTask } from '../types.js';

const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicStrategy implements ProviderStrategy {
  async execute<T>(task: ToolUseTask, ref: ModelRef): Promise<ToolUseResult<T>> {
    const startedAt = Date.now();
    const toolChoice = toAnthropicToolChoice(task.toolChoice);
    const body: Record<string, unknown> = {
      model: ref.modelId,
      max_tokens: task.maxTokens,
      system: task.system,
      tools: toAnthropicTools(task.tools),
      messages: task.messages,
    };
    if (toolChoice !== undefined) body.tool_choice = toolChoice;

    const res = await fetch(`${ref.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ref.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        ...ref.extraHeaders,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const data = await res.json();
    const parsed = parseAnthropicResponse(data);

    if (parsed.toolCalls.length === 0 && task.toolChoice.type === 'force') {
      throw new Error('No tool_use block in Anthropic response');
    }

    return {
      result: (parsed.toolCalls[0]?.input ?? {}) as T,
      ...parsed,
      latencyMs: Date.now() - startedAt,
    };
  }
}
