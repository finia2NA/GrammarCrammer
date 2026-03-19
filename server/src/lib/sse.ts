import type { Response } from 'express';

export function sseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendChunk(res: Response, data: { type: string; [key: string]: unknown }) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sendDone(res: Response, extra: Record<string, unknown> = {}) {
  res.write(`data: ${JSON.stringify({ type: 'done', ...extra })}\n\n`);
  res.end();
}

export function sendError(res: Response, message: string) {
  res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  res.end();
}
