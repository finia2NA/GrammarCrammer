import type { AiAnalyticsContext } from '../analytics.service.js';
import { capture, captureAiGeneration, captureException } from '../analytics.service.js';
import { EXPLANATION_EDIT_SYSTEM, EXPLANATION_EDIT_TOOLS } from '../../constants/prompts.js';
import { ANTHROPIC_API_URL, calcCost, errorCode, errorMessage, headers, recordUsage, resolveApiKey, SONNET } from './shared.js';

export async function editExplanation(
  userId: string,
  currentExplanation: string,
  instruction: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  analyticsContext?: AiAnalyticsContext,
): Promise<{ explanation: string; summary: string; cost: number }> {
  const { apiKey, source } = await resolveApiKey(userId);
  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  const conversationMessages = [
    ...messages.map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user' as const,
      content: `Here is the current document:\n\n<document>\n${currentExplanation}\n</document>\n\nEdit instruction: ${instruction}`,
    },
  ];

  let explanation = currentExplanation;
  let summary = '';

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: SONNET,
        max_tokens: 8192,
        system: EXPLANATION_EDIT_SYSTEM,
        tools: EXPLANATION_EDIT_TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema,
        })),
        messages: conversationMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
    }

    const data = await res.json() as {
      usage?: { input_tokens?: number; output_tokens?: number };
      content: Array<{ type: string; name?: string; input?: Record<string, string>; text?: string }>;
    };
    inputTokens = data.usage?.input_tokens ?? 0;
    outputTokens = data.usage?.output_tokens ?? 0;
    const cost = calcCost(SONNET, inputTokens, outputTokens);
    const latencyMs = Date.now() - startedAt;

    const toolCalls = data.content.filter(b => b.type === 'tool_use');
    const textBlocks = data.content.filter(b => b.type === 'text');
    summary = textBlocks.map(b => b.text ?? '').join('').trim();

    const rewriteCall = toolCalls.find(b => b.name === 'rewrite_all');
    const otherCalls = toolCalls.filter(b => b.name !== 'rewrite_all');
    const warnings: string[] = [];

    for (const call of otherCalls) {
      const input = call.input ?? {};
      if (call.name === 'replace_text') {
        const idx = explanation.indexOf(input.old_text ?? '');
        if (idx === -1) {
          warnings.push(`replace_text: could not find "${(input.old_text ?? '').slice(0, 40)}..."`);
        } else {
          explanation = explanation.slice(0, idx) + (input.new_text ?? '') + explanation.slice(idx + (input.old_text ?? '').length);
        }
      } else if (call.name === 'insert_after') {
        const idx = explanation.indexOf(input.anchor_text ?? '');
        if (idx === -1) {
          warnings.push(`insert_after: could not find anchor "${(input.anchor_text ?? '').slice(0, 40)}..." — appended to end`);
          explanation = explanation + '\n' + (input.new_text ?? '');
        } else {
          const insertAt = idx + (input.anchor_text ?? '').length;
          explanation = explanation.slice(0, insertAt) + (input.new_text ?? '') + explanation.slice(insertAt);
        }
      }
    }

    if (rewriteCall?.input?.new_text) {
      explanation = rewriteCall.input.new_text;
    }

    if (warnings.length > 0) {
      summary = [summary, ...warnings.map(w => `⚠ ${w}`)].filter(Boolean).join('\n');
    }

    captureAiGeneration(userId, {
      ...analyticsContext,
      endpoint: 'explanation-edit',
      traceId: analyticsContext?.traceId ?? `explanation_edit:${analyticsContext?.deckId ?? 'unknown'}:${Date.now()}`,
      model: SONNET,
      source,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      success: true,
      stream: false,
      input: {
        instruction_length: instruction.length,
        explanation_length: currentExplanation.length,
        message_count: messages.length,
      },
      output: {
        tool_calls_count: toolCalls.length,
        summary_length: summary.length,
      },
    });

    await recordUsage(userId, source, 'explanation-edit', SONNET, cost);
    return { explanation, summary, cost };
  } catch (error) {
    captureAiGeneration(userId, {
      ...analyticsContext,
      endpoint: 'explanation-edit',
      traceId: analyticsContext?.traceId ?? `explanation_edit:${analyticsContext?.deckId ?? 'unknown'}:${Date.now()}`,
      model: SONNET,
      source: 'own',
      inputTokens,
      outputTokens,
      cost: calcCost(SONNET, inputTokens, outputTokens),
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: errorCode(error),
      errorMessage: errorMessage(error),
      stream: false,
    });
    captureException(error, userId, { endpoint: 'explanation-edit' });
    capture(userId, 'ai_request_failed', { endpoint: 'explanation-edit', model: SONNET, error_code: errorCode(error) });
    throw error;
  }
}
