import { botConfig, db, eq } from 'database';
import { bento } from '../cache';
import Handlebars from 'handlebars';

export const QUESTION_EXTRACTOR_SYSTEM_PROMPT = `You are an advanced text analysis assistant. Your task is to extract the question from a given piece of text. If the text contains a direct question, return it verbatim. If the text is a statement implying a question, rephrase it into a clear and concise question. If no question is present, respond with "NO_QUESTION_DETECTED" Ensure that your output is only the extracted or rephrased question, without additional commentary.`;

export const BILL_RELATED_TO_TWEET_PROMPT = `You are an AI assistant tasked with analyzing the relationship between a given tweet and a provided U.S. Congressional bill. Your goal is to determine whether the content of the tweet is related to the bill based on substantive connections, such as shared topics, key policy areas, legislative impact, or direct mentions.  

## Instructions: 
1. Extract Key Information
- Identify the main topic, claims, or concerns expressed in the tweet.  
- Analyze the bill's title, summary, and key provisions.  

2. Determine Relevance
- If the tweet discusses or directly references the bill, its contents, or its impact, they are related.  
- If the tweet aligns with the bill's topic but does not specifically reference it or its provisions, check for strong thematic connections.  
- If the tweet is unrelated to the bill's subject matter, they are NOT RELATED.  

3. Response Format:
- If the tweet and bill are related, return: "YES".
- If they are not related, return: "NO".

Your decision should be based purely on textual and contextual analysis, avoiding assumptions beyond the provided content.  
`;

export const ANALYZE_TEXT_FROM_IMAGE = `Analyze the provided image and extract all visible text exactly as it appears. Do not add any commentary or descriptions. If no text is found, return only 'NO_TEXT_FOUND'.`;

export const PROMPTS = {
  SYSTEM_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_SYSTEM_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'SYSTEM_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('SYSTEM_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
  INTERACTION_SYSTEM_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_INTERACTION_SYSTEM_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'INTERACTION_SYSTEM_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('INTERACTION_SYSTEM_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
  INTERACTION_REFINE_OUTPUT_PROMPT: async ({ topic }: { topic: string }) => {
    const prompt = await bento.getOrSet(
      'BOT_CONFIG_INTERACTION_REFINE_OUTPUT_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'INTERACTION_REFINE_OUTPUT_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('INTERACTION_REFINE_OUTPUT_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
    const templatedPrompt = Handlebars.compile(prompt);
    return templatedPrompt({ topic });
  },
  TWITTER_REPLY_TEMPLATE: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_TWITTER_REPLY_TEMPLATE',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'TWITTER_REPLY_TEMPLATE'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('TWITTER_REPLY_TEMPLATE not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
  REPLY_TWEET_QUESTION_PROMPT: ({
    question,
  }: {
    question: string;
  }) => `Please answer this question in context of this conversation: "${question}"
  IMPORTANT:
  Remember if a [Bill Title] is found to use specifics, including bill references ([Bill Title], Section [###]: [Section Name]), names, and attributions. Do not remove relevant policy context. If no [Bill Title] is found, do not generate or infer any bill names, legislative history, or policy details from OpenAI's training data; instead, answer the question directly based only on the provided context without referencing any bill. Deviating from these instructions by fabricating information or relying on unauthorized sources is extremely dangerous and must not happen under any circumstances.`,
  INTERACTION_ENGAGEMENT_DECISION_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_INTERACTION_ENGAGEMENT_DECISION_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'INTERACTION_ENGAGEMENT_DECISION_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('INTERACTION_ENGAGEMENT_DECISION_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
  ENGAGEMENT_DECISION_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_INTERACTION_ENGAGEMENT_DECISION_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'ENGAGEMENT_DECISION_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('ENGAGEMENT_DECISION_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
};
