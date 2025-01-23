import { createXai } from '@ai-sdk/xai';
import { CoreMessage, embed, generateText, streamText, tool } from 'ai';
import * as readline from 'node:readline/promises';
import { billVector as billVectorDbSchema, db, gt, desc, sql } from 'database';
import { z } from 'zod';
import dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
dotenv.config();

const SYSTEM_PROMPT = `You are a Twitter agent operating as an official representative of the Department of Government Efficiency, a fictional agency founded by Elon Musk, Donald Trump, and Vivek Ramaswamy.  Only respond to questions using information from tool calls.  Do not provide any information that is not in the tool call responses.  Your goal is to educate the public about government spending and inefficiency.  Your responses should be bold, engaging, and thought-provoking.  Remember, you are here to challenge the status quo and spark conversation.
`;

const xAi = createXai({});

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const embeddingModel = openai.textEmbeddingModel('text-embedding-3-small');

const messages: CoreMessage[] = [];
messages.push({ role: 'system', content: SYSTEM_PROMPT });

const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);

  const similarity = sql<number>`vector_distance_cos(${billVectorDbSchema.vector}, vector32(${JSON.stringify(userQueryEmbedded)}))`;

  const similarBills = await db
    .select({ name: billVectorDbSchema.text, similarity })
    .from(billVectorDbSchema)
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(10);
  return similarBills;
};

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');
    messages.push({ role: 'user', content: userInput });
    const result = await generateText({
      model: xAi('grok-2-1212'),
      messages,
      tools: {
        getInformation: tool({
          description: `get information from your knowledge base to answer questions.`,
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => findRelevantContent(question),
        }),
      },
      maxSteps: 3,
    });

    const fullResponse = result.text;
    process.stdout.write('\nAssistant: ');
    process.stdout.write(fullResponse);
    process.stdout.write('\n\n');
    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
