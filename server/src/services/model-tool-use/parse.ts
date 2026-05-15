import type { ToolCallBlock } from './types.js';

export interface ParsedToolResponse {
  toolCalls: ToolCallBlock[];
  textBlocks: string[];
  inputTokens: number;
  outputTokens: number;
  providerCost?: number;
}

export async function parseErrorResponse(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `HTTP ${res.status}`;
  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof json.error === 'string') return json.error;
    return json.error?.message ?? json.message ?? `HTTP ${res.status}`;
  } catch {
    return text.slice(0, 300);
  }
}

export function parseAnthropicResponse(data: unknown): ParsedToolResponse {
  const d = data as {
    usage?: { input_tokens?: number; output_tokens?: number };
    content?: Array<{ type: string; name?: string; input?: Record<string, unknown>; text?: string }>;
  };
  const content = d.content ?? [];
  const toolCalls = content
    .filter(b => b.type === 'tool_use')
    .map(b => ({ name: b.name ?? '', input: b.input ?? {} }));
  const textBlocks = content
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '');
  return {
    toolCalls,
    textBlocks,
    inputTokens: d.usage?.input_tokens ?? 0,
    outputTokens: d.usage?.output_tokens ?? 0,
  };
}

export function parseOpenAiResponse(data: unknown): ParsedToolResponse {
  const d = data as {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
      cost?: number;
    };
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ function?: { name?: string; arguments?: string | object } }>;
      };
    }>;
  };
  const message = d.choices?.[0]?.message;
  const toolCalls: ToolCallBlock[] = (message?.tool_calls ?? []).map(call => {
    const args = call.function?.arguments;
    const input: Record<string, unknown> =
      typeof args === 'string'
        ? (JSON.parse(args) as Record<string, unknown>)
        : ((args as Record<string, unknown>) ?? {});
    return { name: call.function?.name ?? '', input };
  });
  const textBlocks = message?.content ? [message.content] : [];
  return {
    toolCalls,
    textBlocks,
    inputTokens: d.usage?.prompt_tokens ?? d.usage?.input_tokens ?? 0,
    outputTokens: d.usage?.completion_tokens ?? d.usage?.output_tokens ?? 0,
    providerCost: typeof d.usage?.cost === 'number' ? d.usage.cost : undefined,
  };
}
