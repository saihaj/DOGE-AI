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
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { DEEPINFRA_API_KEY, OPEN_ROUTER_API_KEY } from '../const';
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
});
export type ChatStreamInput = Static<typeof ChatStreamInput>;

const openrouter = createOpenRouter({
  apiKey: OPEN_ROUTER_API_KEY,
});

const deepinfra = createDeepInfra({
  apiKey: DEEPINFRA_API_KEY,
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
    'o3-mini': openai('o3-mini'),
    'o4-mini': openai('o4-mini'),
    'claude-3-5-sonnet-latest': anthropic('claude-3-5-sonnet-latest'),
    'claude-3-5-haiku-latest': anthropic('claude-3-5-haiku-latest'),
    'deepseek-r1': wrapLanguageModel({
      model: deepinfra('deepseek-ai/DeepSeek-R1'),
      middleware: [
        extractReasoningMiddleware({
          tagName: 'think',
        }),
      ],
    }),
    'llama-4-maverick': openrouter.chat('meta-llama/llama-4-maverick'),
    'llama-4-scout': openrouter.chat('meta-llama/llama-4-scout'),
    'grok-3-mini': xai('grok-3-mini'),
    'grok-3': xai('grok-3'),
    'gemini-1.5-flash': google('gemini-1.5-flash'),
    'gemini-1.5-pro': google('gemini-1.5-pro'),
    'gemini-2.0-flash-exp': google('gemini-2.0-flash-exp'),
    'gemini-2.0-flash-thinking': google('gemini-2.0-flash-thinking-exp-01-21'),
    'gemini-2.5-pro-exp': google('gemini-2.5-pro-exp-03-25'),
  },
});
