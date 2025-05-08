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