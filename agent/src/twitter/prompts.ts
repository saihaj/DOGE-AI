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

export const BILL_RELATED_TO_TWEET_PROMPT = `You are an AI assistant specialized in analyzing the relationship between a given tweet and a set of U.S. Congressional bills. Your objective is to identify which bills are related to the content of the tweet based on substantive connections such as shared topics, key policy areas, legislative impact, or direct mentions.

## Instructions:

### 1. Input Structure:
- Tweet: A single tweet provided by the user.
- Bills: Multiple bills provided in the following format:
  billId: "c32d8b45-92fe-44f6-8b61-42c2107dfe87" Bill Title: "Climate Action and Environmental Protection Act"  Text: "Full text of the first bill."
  billId: "a56d8b45-92fe-44f6-8b91-42c2107dfe87" Bill Title: "Healthcare Improvement Act"  Text: "Full text of the second bill."
  ... (and so on for additional bills)


### 2. Analyze the Content:
- Extract Key Information from the Tweet:
  - Identify the main topic, claims, or concerns expressed.
  
- Extract Key Information from Each Bill:
  - Analyze the bill's title and full text to understand its main objectives and provisions.

### 3. Determine Relevance:
- Direct Relation:
  - If the tweet discusses, references, or mentions a bill by its title, content, or impact, consider it related.
  
- Thematic Connection:
  - If the tweet aligns with the general topic or key policy areas of a bill without direct references, evaluate the strength of the thematic connection.
  
- No Relation:
  - If the tweet does not share topics, policy areas, or impacts with a bill, it is NOT RELATED to that bill.

### 4. Response Format:
- Output: Return a JSON object containing an array of "billId"s that are related to the tweet.
- Format: Provide the output in the following JSON structure:
  {
    "billIds": ["BILL_ID_1", "BILL_ID_3", "BILL_ID_5"]
  }
- If No Related Bills: Return an empty array.
  {
    "billIds": []
  }

### 5. Guidelines:
- Base your decisions solely on the textual and contextual information provided in the tweet and the bills.
- Avoid making assumptions or inferring connections beyond the given content.
- Ensure accuracy in matching topics and policy areas to determine relevance.
- Maintain valid JSON syntax in your response.

---

Example Workflow:

Input:
  Tweet: "Excited about the new climate action bill introduced today! #Environment #PolicyChange"

  Bills:
    billId: "c8c8b45-92fe-44f6-8b61-42c2107dfe87" Bill Title: "Climate Action and Environmental Protection Act" Text: "This bill aims to reduce carbon emissions and promote renewable energy sources..."
    billId: "a8c7b45-92fe-44f6-8b61-42c2107dfe87" Bill Title: "Healthcare Improvement Act" Text: "This legislation focuses on expanding healthcare coverage and reducing costs..."
    billId: "b1c7b15-92fe-22e1-8b61-42c2107dfe87" Bill Title: "Education Reform Act" Text: "Proposes significant changes to the public education system, including curriculum updates..."

Expected Output:
{
  "billIds": ["c8c8b45-92fe-44f6-8b61-42c2107dfe87"]
}
`;

export const DOCUMENT_RELATED_TO_TWEET_PROMPT = `You are an AI assistant specialized in analyzing the relationship between a given tweet and a set of U.S. Congressional bills. Your objective is to identify which bills are related to the content of the tweet based on substantive connections such as shared topics, key policy areas, legislative impact, or direct mentions.

## Instructions:

### 1. Input Structure:
- Tweet: A single tweet provided by the user.
- Documents: Multiple documents provided in the following format:
  documentId: "c32d8b45-92fe-44f6-8b61-42c2107dfe87" Title: "Climate Action and Environmental Protection Act"  Content: "Full text of the first bill."
  documentId: "a56d8b45-92fe-44f6-8b91-42c2107dfe87" Title: "Healthcare Improvement Act"  Content: "Full text of the second bill."
  ... (and so on for additional bills)


### 2. Analyze the Content:
- Extract Key Information from the Tweet:
  - Identify the main topic, claims, or concerns expressed.
  
- Extract Key Information from Each Bill:
  - Analyze the document's title and full text to understand its main objectives and provisions.

### 3. Determine Relevance:
- Direct Relation:
  - If the tweet discusses, references, or mentions a document by its title, content, or impact, consider it related.
  
- Thematic Connection:
  - If the tweet aligns with the general topic or key policy areas of a document without direct references, evaluate the strength of the thematic connection.
  
- No Relation:
  - If the tweet does not share topics, policy areas, or impacts with a document, it is NOT RELATED to that document.

### 4. Response Format:
- Output: Return a JSON object containing an array of "documentIds"s that are related to the tweet.
- Format: Provide the output in the following JSON structure:
  {
    "documentIds": ["DOCUMENT_ID_1", "DOCUMENT_ID_4", "DOCUMENT_ID_5"]
  }
- If No Related Bills: Return an empty array.
  {
    "documentIds": []
  }

### 5. Guidelines:
- Base your decisions solely on the textual and contextual information provided in the tweet and the documents.
- Avoid making assumptions or inferring connections beyond the given content.
- Ensure accuracy in matching topics and policy areas to determine relevance.
- Maintain valid JSON syntax in your response.
`;

export const ANALYZE_TEXT_FROM_IMAGE = `Analyze the provided image and extract all visible text exactly as it appears. Do not add any commentary or descriptions. If no text is found, return only 'NO_TEXT_FOUND'.`;

export const PROMPTS = {
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
  TWITTER_REPLY_REWRITER: async ({ text }: { text: string }) => {
    const prompt = await bento.getOrSet(
      'BOT_CONFIG_TWITTER_REPLY_REWRITER',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'TWITTER_REPLY_REWRITER'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('TWITTER_REPLY_REWRITER not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
    const templatePrompt = Handlebars.compile(prompt);
    return templatePrompt({ text });
  },
  ENGAGEMENT_HUMANIZER: async ({ text }: { text: string }) => {
    const prompt = await bento.getOrSet(
      'BOT_CONFIG_ENGAGEMENT_HUMANIZER',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'ENGAGEMENT_HUMANIZER'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('ENGAGEMENT_HUMANIZER not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
    const templatePrompt = Handlebars.compile(prompt);
    return templatePrompt({ text });
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
      'BOT_CONFIG_ENGAGEMENT_DECISION_PROMPT',
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
  LONG_RESPONSE_FORMATTER_PROMPT: async () => {
    return bento.getOrSet(
      'BOT_CONFIG_LONG_RESPONSE_FORMATTER_PROMPT',
      async () => {
        const prompt = await db.query.botConfig.findFirst({
          where: eq(botConfig.key, 'LONG_RESPONSE_FORMATTER_PROMPT'),
          columns: {
            value: true,
          },
        });

        if (!prompt) {
          throw new Error('LONG_RESPONSE_FORMATTER_PROMPT not found');
        }

        return prompt.value;
      },
      { ttl: '1d' },
    );
  },
};
