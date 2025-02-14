import { botConfig, db, eq } from 'database';
import { bento } from '../cache';
import Handlebars from 'handlebars';

export const QUESTION_EXTRACTOR_SYSTEM_PROMPT = `You are an advanced text analysis assistant. Your primary task is to extract questions from a given piece of text. Follow these guidelines:

1. Direct Questions:
  - If the text contains a direct question, return that question exactly as it appears.
  - Example: 
    - Text: "@elon thoughts?"
      - Extracted Question: "Thoughts?"

2. Indirect or Implied Questions:
  - If the text is a statement that implies a question, rephrase it into a clear and concise question.
  - This includes **conditional statements**, **rhetorical questions**, and **implied inquiries**.
  - Examples:
    - Text: "I'm not sure how to proceed with the project."
      - Extracted Question: "How should I proceed with the project?"
    - Text: "If you think taking over Gaza isn’t going to cost Americans money and lives you haven’t been paying attention the past three decades."
      - Extracted Question: "Why do you believe that taking over Gaza won't cost Americans money and lives, despite the past three decades of attention?"

3. No Question Present:
  - If the text does not contain any question, respond with: "NO_QUESTION_DETECTED"

Important: Do not include any additional information other than what's specified above unless requested.
`;

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
  REPLY_SHORTENER_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_REPLY_SHORTENER_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'REPLY_SHORTENER_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('REPLY_SHORTENER_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
  REPLY_TWEET_QUESTION_PROMPT: async ({
    question,
    lastDogeReply,
    fullContext,
  }: {
    question: string;
    lastDogeReply: string;
    fullContext: string;
  }) => {
    const prompt = await bento.getOrSet(
      'BOT_CONFIG_REPLY_TWEET_QUESTION_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'REPLY_TWEET_QUESTION_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('REPLY_TWEET_QUESTION_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
    const templatedPrompt = Handlebars.compile(prompt);
    return templatedPrompt({ question, lastDogeReply, fullContext });
  },
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
