import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';
import { Static, Type } from '@sinclair/typebox';
import { experimental_customProvider } from 'ai';

export const ChatStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
  billSearch: Type.Boolean(),
  documentSearch: Type.Boolean(),
  manualKbSearch: Type.Boolean(),
});
export type ChatStreamInput = Static<typeof ChatStreamInput>;

export const myProvider = experimental_customProvider({
  languageModels: {
    'sonar-reasoning-pro': perplexity('sonar-reasoning-pro'),
    'sonar-reasoning': perplexity('sonar-reasoning'),
    'sonar-pro': perplexity('sonar-pro'),
    'o3-mini': openai('o3-mini'),
    'gpt-4o': openai('gpt-4o'),
    'claude-3-5-sonnet-latest': anthropic('claude-3-5-sonnet-latest'),
    'claude-3-7-sonnet-latest': anthropic('claude-3-7-sonnet-latest'),
  },
});
