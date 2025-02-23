import { openai } from '@ai-sdk/openai';
import { perplexity } from '@ai-sdk/perplexity';
import { Static, Type } from '@sinclair/typebox';
import { experimental_customProvider } from 'ai';

export const ChatStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
});
export type ChatStreamInput = Static<typeof ChatStreamInput>;

export const myProvider = experimental_customProvider({
  languageModels: {
    'sonar-reasoning-pro': perplexity('sonar-reasoning-pro'),
    'sonar-reasoning': perplexity('sonar-reasoning'),
    'o3-mini': openai('o3-mini'),
    'gpt-4o': openai('gpt-4o'),
  },
});
