import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';
import { Static, Type } from '@sinclair/typebox';
import { customProvider } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { OPEN_ROUTER_API_KEY } from '../const';

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

export const myProvider = customProvider({
  languageModels: {
    'sonar-reasoning-pro': perplexity('sonar-reasoning-pro'),
    'sonar-reasoning': perplexity('sonar-reasoning'),
    'sonar-pro': perplexity('sonar-pro'),
    'o3-mini': openai('o3-mini'),
    'gpt-4o': openai('gpt-4o'),
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'claude-3-5-sonnet-latest': anthropic('claude-3-5-sonnet-latest'),
    'claude-3-7-sonnet-latest': anthropic('claude-3-7-sonnet-latest'),
    'deepseek-r1': openrouter.chat('deepseek/deepseek-r1', {
      reasoning: {
        effort: 'high',
      },
    }),
    'deepseek-r1:online': openrouter.chat('deepseek/deepseek-r1:online', {
      reasoning: {
        effort: 'high',
      },
    }),
  },
});
