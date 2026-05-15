import type { ToolDef } from '../../constants/prompts.js';

export type { ToolDef };

export type ToolUseStrategyId = 'anthropic' | 'openai-compatible' | 'deepseek';

export interface ModelRef {
  strategy: ToolUseStrategyId;
  modelId: string;
  apiKey: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
}

export type ToolChoiceMode =
  | { type: 'force'; toolName: string }
  | { type: 'auto' }
  | { type: 'required' };

export interface ToolUseTask {
  system: string;
  tools: ToolDef[];
  toolChoice: ToolChoiceMode;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  thinking?: { useful: boolean };
}

export interface ToolCallBlock {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolUseResult<T = unknown> {
  result: T;
  toolCalls: ToolCallBlock[];
  textBlocks: string[];
  inputTokens: number;
  outputTokens: number;
  providerCost?: number;
  latencyMs: number;
}

export interface ProviderStrategy {
  execute<T>(task: ToolUseTask, ref: ModelRef): Promise<ToolUseResult<T>>;
}
