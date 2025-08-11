import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';
import { Static, Type } from '@sinclair/typebox';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { OPEN_ROUTER_API_KEY } from '../const';
import { xai } from '@ai-sdk/xai';
import { google } from '@ai-sdk/google';

export const ChatStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
  billSearch: Type.Boolean(),
  documentSearch: Type.Boolean(),
  manualKbSearch: Type.Boolean(),
  webSearch: Type.Boolean(),
  selectedOrgId: Type.String(),
});
export type ChatStreamInput = Static<typeof ChatStreamInput>;

const openrouter = createOpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

export const myProvider = customProvider({
  languageModels: {
    'sonar-reasoning-pro': perplexity('sonar-reasoning-pro'),
    'sonar-reasoning': perplexity('sonar-reasoning'),
    'gpt-4o': openai('gpt-4o'),
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'gpt-4.1': openai('gpt-4.1'),
    'gpt-4.1-mini': openai('gpt-4.1-mini'),
    'gpt-4.1-nano': openai('gpt-4.1-nano'),
    'gpt-5': openai('gpt-5'),
    'gpt-5-mini': openai('gpt-5-mini'),
    'gpt-5-nano': openai('gpt-5-nano'),
    'gpt-5-chat-latest': openai('gpt-5-chat-latest'),
    'o3-mini': openai('o3-mini'),
    'gpt-oss-120b': openrouter.chat('openai/gpt-oss-120b'),
    'gpt-oss-20b': openrouter.chat('openai/gpt-oss-20b'),
    'claude-3-5-sonnet-latest': anthropic('claude-3-5-sonnet-latest'),
    'claude-3-5-haiku-latest': anthropic('claude-3-5-haiku-latest'),
    'moonshotai/kimi-k2': openrouter.chat('moonshotai/kimi-k2'),
    'deepseek-r1': wrapLanguageModel({
      model: openrouter.chat('deepseek/deepseek-r1', {
        reasoning: {
          effort: 'high',
        },
      }),
      middleware: [
        extractReasoningMiddleware({
          tagName: 'think',
        }),
      ],
    }),
    'deepseek-r1-0528': wrapLanguageModel({
      model: openrouter.chat('deepseek/deepseek-r1-0528', {
        reasoning: {
          effort: 'high',
        },
      }),
      middleware: [
        extractReasoningMiddleware({
          tagName: 'think',
        }),
      ],
    }),
    'grok-3-mini': xai('grok-3-mini'),
    'grok-3': xai('grok-3'),
    'gemini-1.5-flash': google('gemini-1.5-flash'),
    'gemini-1.5-pro': google('gemini-1.5-pro'),
    'gemini-2.0-flash-exp': google('gemini-2.0-flash-exp'),
    'gemini-2.0-flash-thinking': google('gemini-2.0-flash-thinking-exp-01-21'),
    'gemini-2.5-pro-exp': google('gemini-2.5-pro-exp-03-25'),
  },
});
