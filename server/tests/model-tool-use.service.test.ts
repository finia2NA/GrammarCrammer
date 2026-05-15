import assert from 'node:assert/strict';
import { executeToolUse, type ToolUseRequestConfig } from '../src/services/model-tool-use.service.js';
import type { PromptWithTool, ToolDef } from '../src/constants/prompts.js';

const tool: ToolDef = {
  name: 'submit_result',
  description: 'Submit the structured result.',
  inputSchema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      note: { type: 'string' },
    },
    required: ['ok', 'note'],
  },
};

const prompt: PromptWithTool = {
  system: 'System prompt',
  tool,
};

type FetchCall = { url: string; body: Record<string, unknown> };

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

async function withMockFetch(responses: unknown[], run: (calls: FetchCall[]) => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    const next = responses.shift();
    if (next === undefined) throw new Error('Unexpected fetch call');
    return response(next);
  }) as typeof fetch;

  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function config(provider: ToolUseRequestConfig['route']['provider'], model: string, toolCallMode: ToolUseRequestConfig['toolCallMode'] = 'standard'): ToolUseRequestConfig {
  return {
    route: { provider, model },
    apiKey: 'test-key',
    baseUrl: provider === 'anthropic' ? 'https://api.anthropic.com/v1' : `https://api.${provider}.test`,
    headers: { 'Content-Type': 'application/json' },
    toolCallMode,
    parseErrorResponse: async () => 'request failed',
  };
}

async function testAnthropicSingleToolShape() {
  await withMockFetch([
    { usage: { input_tokens: 2, output_tokens: 3 }, content: [{ type: 'tool_use', input: { ok: true, note: 'done' } }] },
  ], async (calls) => {
    const result = await executeToolUse<{ ok: boolean; note: string }>(config('anthropic', 'claude-haiku'), {
      kind: 'single',
      endpoint: 'cards',
      prompt,
      userMessage: 'User message',
      maxTokens: 100,
      thinkingFallback: 'disable-thinking',
    });

    assert.deepEqual(result.result, { ok: true, note: 'done' });
    assert.equal(calls[0]?.url, 'https://api.anthropic.com/v1/messages');
    assert.deepEqual(calls[0]?.body, {
      model: 'claude-haiku',
      max_tokens: 100,
      system: 'System prompt',
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.inputSchema }],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: 'User message' }],
    });
  });
}

async function testOpenAiRequiredToolChoice() {
  await withMockFetch([
    { usage: { prompt_tokens: 5, completion_tokens: 7 }, choices: [{ message: { tool_calls: [{ function: { name: tool.name, arguments: '{"ok":true,"note":"parsed"}' } }] } }] },
  ], async (calls) => {
    const result = await executeToolUse<{ ok: boolean; note: string }>(config('openai', 'gpt-5-mini'), {
      kind: 'single',
      endpoint: 'judge',
      prompt,
      userMessage: 'User message',
      maxTokens: 100,
      thinkingFallback: 'disable-thinking',
    });

    assert.deepEqual(result.result, { ok: true, note: 'parsed' });
    assert.equal(calls[0]?.body.tool_choice, 'required');
  });
}

async function testDeepSeekCardsCanUseTwoTurns() {
  await withMockFetch([
    { usage: { prompt_tokens: 1, completion_tokens: 2 }, choices: [{ message: { content: 'Make a useful card.' } }] },
    { usage: { prompt_tokens: 3, completion_tokens: 4 }, choices: [{ message: { tool_calls: [{ function: { arguments: { ok: true, note: 'card' } } }] } }] },
  ], async (calls) => {
    await executeToolUse(config('deepseek', 'deepseek-v4-flash', 'thinking-two-turn'), {
      kind: 'single',
      endpoint: 'cards',
      prompt,
      userMessage: 'User message',
      maxTokens: 100,
      thinkingFallback: 'two-turn',
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]?.body.thinking, { type: 'enabled' });
    assert.deepEqual(calls[1]?.body.thinking, { type: 'disabled' });
  });
}

async function testDeepSeekJudgeCanDisableThinking() {
  await withMockFetch([
    { usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ message: { tool_calls: [{ function: { arguments: { ok: true, note: 'quick' } } }] } }] },
  ], async (calls) => {
    await executeToolUse(config('deepseek', 'deepseek-v4-flash', 'thinking-two-turn'), {
      kind: 'single',
      endpoint: 'judge',
      prompt,
      userMessage: 'User message',
      maxTokens: 300,
      thinkingFallback: 'disable-thinking',
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0]?.body.thinking, { type: 'disabled' });
  });
}

async function testDeepSeekThinkingEndpointUsesTwoTurns() {
  await withMockFetch([
    { usage: { prompt_tokens: 11, completion_tokens: 13 }, choices: [{ message: { content: 'The answer should be accepted.' } }] },
    { usage: { prompt_tokens: 17, completion_tokens: 19 }, choices: [{ message: { tool_calls: [{ function: { arguments: '{"ok":true,"note":"accepted"}' } }] } }] },
  ], async (calls) => {
    const result = await executeToolUse<{ ok: boolean; note: string }>(config('deepseek', 'deepseek-v4-pro', 'thinking-two-turn'), {
      kind: 'single',
      endpoint: 'judge',
      prompt,
      userMessage: 'User message',
      maxTokens: 100,
      thinkingFallback: 'two-turn',
    });

    assert.deepEqual(result.result, { ok: true, note: 'accepted' });
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.body.model, 'deepseek-v4-pro');
    assert.equal(calls[1]?.body.model, 'deepseek-v4-flash');
    assert.equal(calls[0]?.body.tools, undefined);
    assert.equal(calls[0]?.body.max_tokens, 512);
    assert.deepEqual(calls[0]?.body.thinking, { type: 'enabled' });
    assert.deepEqual(calls[1]?.body.thinking, { type: 'disabled' });
    assert.equal(calls[1]?.body.max_tokens, 256);
    assert.equal(result.usage.inputTokens, 28);
    assert.equal(result.usage.outputTokens, 32);
    assert.deepEqual(result.usage.modelUsage, [
      { model: 'deepseek-v4-pro', inputTokens: 11, outputTokens: 13 },
      { model: 'deepseek-v4-flash', inputTokens: 17, outputTokens: 19 },
    ]);
  });
}

async function testMultiEditPreservesTextAndTools() {
  await withMockFetch([
    {
      usage: { prompt_tokens: 3, completion_tokens: 4 },
      choices: [{ message: { content: 'Updated the sentence.', tool_calls: [{ function: { name: 'replace_text', arguments: '{"old_text":"a","new_text":"b"}' } }] } }],
    },
  ], async () => {
    const result = await executeToolUse(config('openai', 'gpt-5-mini'), {
      kind: 'multi-edit',
      endpoint: 'explanation-edit',
      tools: [{ ...tool, name: 'replace_text' }],
      system: 'Edit system',
      messages: [{ role: 'user', content: 'Edit this' }],
      maxTokens: 100,
      thinkingFallback: 'two-turn',
    });

    assert.equal(result.text, 'Updated the sentence.');
    assert.deepEqual(result.toolCalls, [{ name: 'replace_text', input: { old_text: 'a', new_text: 'b' } }]);
  });
}

async function main() {
  await testAnthropicSingleToolShape();
  await testOpenAiRequiredToolChoice();
  await testDeepSeekCardsCanUseTwoTurns();
  await testDeepSeekJudgeCanDisableThinking();
  await testDeepSeekThinkingEndpointUsesTwoTurns();
  await testMultiEditPreservesTextAndTools();

  console.log('model-tool-use.service tests passed');
}

void main();
