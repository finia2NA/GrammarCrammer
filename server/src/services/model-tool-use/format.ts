import type { ToolDef } from '../../constants/prompts.js';
import type { ToolChoiceMode } from './types.js';

export function toAnthropicTools(tools: ToolDef[]) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

export function toOpenAiTools(tools: ToolDef[]) {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

export function toAnthropicToolChoice(mode: ToolChoiceMode): { type: string; name?: string } | undefined {
  if (mode.type === 'force') return { type: 'tool', name: mode.toolName };
  if (mode.type === 'required') return { type: 'any' };
  return undefined;
}

export function toOpenAiToolChoice(
  mode: ToolChoiceMode,
): 'auto' | 'required' | { type: 'function'; function: { name: string } } {
  if (mode.type === 'force') return { type: 'function', function: { name: mode.toolName } };
  if (mode.type === 'required') return 'required';
  return 'auto';
}
