import type { AiAnalyticsContext } from '../analytics.service.js';
import { EXPLANATION_EDIT_SYSTEM, EXPLANATION_EDIT_TOOLS } from '../../constants/prompts.js';
import { callEditTools } from '../ai-routing.service.js';

export async function editExplanation(
  userId: string,
  currentExplanation: string,
  instruction: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  analyticsContext?: AiAnalyticsContext,
): Promise<{ explanation: string; summary: string; cost: number }> {
  const conversationMessages = [
    ...messages.map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user' as const,
      content: `Here is the current document:\n\n<document>\n${currentExplanation}\n</document>\n\nEdit instruction: ${instruction}`,
    },
  ];

  let explanation = currentExplanation;
  let summary = '';

  const { toolCalls, text, cost } = await callEditTools(
    userId,
    EXPLANATION_EDIT_TOOLS,
    EXPLANATION_EDIT_SYSTEM,
    conversationMessages,
    8192,
    {
      userId,
      endpoint: 'explanation-edit',
      context: analyticsContext,
    },
  );
  summary = text;

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

  return { explanation, summary, cost };
}
