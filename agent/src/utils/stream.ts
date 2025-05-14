import { FastifyReply } from 'fastify';

/**
 * Sets the standard headers required for server-sent events (SSE) streaming responses.
 *
 * @param reply The Fastify reply object to set headers on
 */
export function setStreamHeaders(reply: FastifyReply): void {
  reply.header('Content-Type', 'text/plain; charset=utf-8');
  reply.type('text/event-stream');
  reply.header('X-Vercel-AI-Data-Stream', 'v1');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');
}

export function normalizeHeaderValue(
  header: string | string[] | undefined,
): string | undefined {
  if (typeof header === 'string') {
    return header;
  }
  if (Array.isArray(header)) {
    return header[0]; // Take the first value if it's an array
  }
  return undefined; // Return undefined for missing or invalid headers
}
