import { CoreMessage, generateObject, generateText, tool } from 'ai';
import { WithLogger } from '../logger';
import { generateEmbedding } from './helpers';
import {
  and,
  billVector,
  db,
  document,
  eq,
  isNotNull,
  sql,
  bill as billDbSchema,
  inArray,
  desc,
} from 'database';
import { createOpenAI } from '@ai-sdk/openai';
import {
  ACTIVE_CONGRESS,
  MANUAL_KB_AGENT_SOURCE,
  MANUAL_KB_CHAT_SOURCE,
  REJECTION_REASON,
  SEED,
  TEMPERATURE,
  VECTOR_SEARCH_MATCH_THRESHOLD,
  WEB_SOURCE,
} from '../const';
import {
  BILL_RELATED_TO_TWEET_PROMPT,
  DOCUMENT_RELATED_TO_TWEET_PROMPT,
} from './prompts';
import { z } from 'zod';
import pMap from 'p-map';

/**
 * Given a thread and the extracted question, it will return documents that are related to the tweet.
 */
async function getManualKbDocuments(
  {
    termEmbeddingString,
    kbSourceType,
  }: {
    termEmbeddingString: string;
    kbSourceType: 'agent' | 'chat';
  },
  logger: WithLogger,
) {
  const log = logger.child({
    method: 'getManualKbDocuments',
    kbSourceType,
  });
  const LIMIT = 5;

  const source =
    kbSourceType === 'agent' ? MANUAL_KB_AGENT_SOURCE : MANUAL_KB_CHAT_SOURCE;

  const embeddingsQuery = await db
    .select({
      documentId: billVector.document,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString}))`,
    })
    .from(billVector)
    .where(
      and(
        sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
        isNotNull(billVector.document),
        eq(billVector.source, source),
      ),
    )
    .orderBy(
      sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
    )
    .limit(LIMIT);

  if (embeddingsQuery.length === 0) {
    log.info({}, 'No document embeddings found.');
    return null;
  }

  // remove duplicates
  const uniqueDocumentIds = new Set<string>();
  const _uniqueEmbeddingsQuery = embeddingsQuery.filter(({ documentId }) => {
    if (documentId === null) return false;
    if (uniqueDocumentIds.has(documentId)) return false;
    uniqueDocumentIds.add(documentId);
    return true;
  });

  log.info(
    { all: embeddingsQuery.length, unique: _uniqueEmbeddingsQuery.length },
    'removed duplicates',
  );

  const docs = await db
    .select({
      text: document.content,
      title: document.title,
      documentId: document.id,
    })
    .from(document)
    .where(inArray(document.id, Array.from(uniqueDocumentIds)));

  const baseText = docs
    .map(({ title, text, documentId }) => {
      // @ts-expect-error - I know what I'm doing
      const content = Buffer.from(text).toString('utf-8');

      return `documentId: ${documentId}, Title: ${title}, Content: ${content}`;
    })
    .join('\n\n');

  return baseText;
}

/**
 * Given a thread and the extracted question, it will return documents that are related to the tweet.
 */
async function getDocumentContext(
  {
    messages,
    termEmbeddingString,
    openaiApiKey,
  }: {
    messages: CoreMessage[];
    termEmbeddingString: string;
    openaiApiKey: string;
  },
  logger: WithLogger,
) {
  const log = logger.child({
    method: 'getDocumentContext',
  });
  const LIMIT = 5;

  const embeddingsQuery = await db
    .select({
      text: document.content,
      documentId: billVector.document,
      title: document.title,
      source: document.source,
      distance: sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString}))`,
    })
    .from(billVector)
    .where(
      and(
        sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
        isNotNull(billVector.document),
        eq(billVector.source, WEB_SOURCE),
      ),
    )
    .orderBy(
      sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
    )
    .leftJoin(document, eq(document.id, billVector.document))
    .limit(LIMIT);

  if (embeddingsQuery.length === 0) {
    log.info({}, 'No document embeddings found.');
    return null;
  }
  log.info({ size: embeddingsQuery.length }, 'found document embeddings');

  // remove duplicates
  const uniqueDocumentIds = new Set<string>();
  const uniqueEmbeddingsQuery = embeddingsQuery
    .filter(({ documentId }) => {
      if (documentId === null) return false;
      if (uniqueDocumentIds.has(documentId)) return false;
      uniqueDocumentIds.add(documentId);
      return true;
    })
    .map(v => ({
      ...v,
      // @ts-expect-error - I know what I'm doing
      text: Buffer.from(v.text).toString('utf-8'),
    }));

  log.info(
    { all: embeddingsQuery.length, unique: uniqueEmbeddingsQuery.length },
    'removed duplicates',
  );

  const baseText = uniqueEmbeddingsQuery
    .map(({ title, text, documentId }) => {
      return `documentId: ${documentId}, Title: ${title}, Content: ${text}`;
    })
    .join('\n\n');

  const openai = createOpenAI({
    apiKey: openaiApiKey,
    compatibility: 'strict',
  });

  const { object: relatedDocuments } = await generateObject({
    model: openai('gpt-4o-mini'),
    seed: SEED,
    temperature: TEMPERATURE,
    schemaName: 'documentRelatedToTweet',
    schema: z.object({
      documentIds: z.array(z.string()).nullish(),
    }),
    schemaDescription: 'List of documentIds related to the tweet.',
    messages: [
      {
        role: 'system',
        content: DOCUMENT_RELATED_TO_TWEET_PROMPT,
      },
      {
        role: 'user',
        content: `Tweet: ${messages.map(m => m.content).join('\n')}\n\nDocuments: ${baseText}`,
      },
    ],
  });

  if (!relatedDocuments.documentIds) {
    log.info({}, 'No related documents found.');
    return null;
  }

  log.info({ documentIds: relatedDocuments.documentIds }, 'related documents');

  return relatedDocuments.documentIds
    .map(documentId => {
      const found = uniqueEmbeddingsQuery.find(
        ({ documentId: id }) => id === documentId,
      );

      if (!found) return null;

      return `documentId: ${documentId}, Title: ${found.title}, Content: ${found.text}, Source: ${found.source}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Given some text try to find the specific bill.
 *
 * It works in the following precedence:
 * 1. If a bill number is found we search that, narrow down to relevancy to the conversation and return most relevant.
 *    We do not do active congress here because someone could be asking a question for past congress bill for some reference
 *    So this approach allows us to make sure we don't rule those out.
 * 2. If we have bill titles we search for those and return the first one.
 * 3. If we have keywords we search we focus on the current congress and return the most relevant.
 */
async function getReasonBillContext(
  {
    messages,
    openaiApiKey,
  }: {
    messages: CoreMessage[];
    openaiApiKey: string;
  },
  logger: WithLogger,
) {
  const log = logger.child({
    method: 'getReasonBillContext',
  });
  const LIMIT = 5;

  const openai = createOpenAI({
    apiKey: openaiApiKey,
    compatibility: 'strict',
  });

  const { object: billTitleResult } = await generateObject({
    model: openai('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    seed: SEED,
    temperature: TEMPERATURE,
    messages: [
      {
        role: 'system',
        content: `You are an AI specialized in extracting bill names, relevant keywords, and bill numbers from text. Given a list of tweets, your task is to return a structured output with the following fields:
      - names: An array of bill names mentioned in the text.
      - keywords: An array of relevant keywords related to the bill or topic discussed.
      - billNumber (optional): If a bill is mentioned in any of the following formats, extract and return only the numeric part:
	- "H.R. 8127" → "8127"
	- "HR 8127" → "8127"
	- "H.R 8127" → "8127"
	- "S. 8127" → "8127"
	- "S 8127" → "8127"
	- "s 8127" → "8127"
	- "hr 8127" → "8127"
	- "h.r. 8127" → "8127"
	- "h.r 8127" → "8127"
       The bill number should always be extracted as a numeric string without prefixes or extra characters.

      If no bill number is found, omit this field.
      Ensure accuracy in extracting bill names and keywords while maintaining the expected structured output.`,
      },
      ...messages,
      {
        role: 'user',
        content:
          'Based on the above tweets, extract the bill names, relevant bill keywords and billNumber. If multiple bills are referenced, list all their titles.',
      },
    ],
    schemaName: 'bill',
    schemaDescription: 'A bill name, relevant keywords and bill number.',
    schema: z.object({
      names: z.array(z.string()),
      keywords: z.array(z.string()),
      billNumber: z.nullable(z.number()),
    }),
  });
  log.info(billTitleResult, 'extracted bill information');

  if (
    billTitleResult.names.length === 0 &&
    billTitleResult.keywords.length === 0 &&
    billTitleResult?.billNumber === null
  ) {
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  // having a bill number makes searching easier
  if (billTitleResult.billNumber) {
    log.info({}, 'Searching for bill from number');
    const billFromNumbers = await db
      .select({
        text: billDbSchema.content,
        billId: billDbSchema.id,
        title: billDbSchema.title,
        number: billDbSchema.number,
        type: billDbSchema.type,
        congress: billDbSchema.congress,
        introducedDate: billDbSchema.introducedDate,
        summary: billDbSchema.summary,
      })
      .from(billDbSchema)
      .where(eq(billDbSchema.number, billTitleResult.billNumber))
      .orderBy(desc(billDbSchema.introducedDate));
    log.info(
      { size: billFromNumbers.length },
      `Found ${billFromNumbers.length} bills from number`,
    );

    const billsText = billFromNumbers
      .map(
        ({
          title,
          text,
          introducedDate,
          billId,
          congress,
          type,
          number,
          summary,
        }) => {
          // @ts-expect-error - I know what I'm doing
          const content = Buffer.from(text).toString('utf-8');

          // we just use summary if the bill is too big
          const textContent = content.length > 500_000 ? summary : content;

          return `"billId": ${billId} "congress": ${congress} "number": ${type} ${number} "title": ${title} "introducedDate": ${introducedDate} "summary": ${textContent}`;
        },
      )
      .join('\n\n');

    // now we need to narrow down what bill person is asking about
    const { object: relevantBill } = await generateObject({
      model: openai('gpt-4o-mini', {
        structuredOutputs: true,
      }),
      seed: SEED,
      temperature: TEMPERATURE,
      messages: [
        {
          role: 'system',
          content: `You are an AI that selects the most relevant bill from a given list based on conversation context.
      Input:
      - A list of bills, each with a "billId", title, summary introduced date.
      - The extracted bill number.
      - Relevant keywords and conversation context.

      Task:
      - Analyze the provided bills and determine which "billId" best matches the conversation context and user intent.
      - Compare against the provided list of bills, looking for the best match by:
        - Relevance to the user's topics and keywords.
        - Alignment with the conversation context.
        - Recency of introduction date, if multiple are equally relevant or if no close match is found.
      - If a clear contextual match exists, return the corresponding "billId".
      - If multiple matches are found, select the most relevant one, or choose the most recent bill if there is no clear contextual match. Return exactly one 'billId' in JSON.
      - If there there is no clear contextual match, return 'null'.

      Expected Output:
      { "billId": "best_matching_bill_id" }
      `,
        },
        {
          role: 'user',
          content: `Conversation Context: ${messages.map(m => m.content).join('\n')}\n\n\nBills: ${billsText}`,
        },
      ],
      schemaName: 'relevantBill',
      schemaDescription: 'Relevant bill ID based on conversation context.',
      schema: z.object({
        billId: z.nullable(z.string()),
      }),
    });

    if (!relevantBill?.billId) {
      log.warn({}, 'no relevant bill found');
      throw new Error(REJECTION_REASON.NO_BILL_ID_FOUND);
    }
    log.info(relevantBill, 'relevant bill found');

    const bill = await db.query.bill.findFirst({
      columns: {
        id: true,
        title: true,
        content: true,
        number: true,
        congress: true,
        type: true,
        introducedDate: true,
      },
      where: eq(billDbSchema.id, relevantBill.billId),
    });

    if (!bill) {
      log.error({ billId: relevantBill.billId }, 'bill not found');
      throw new Error(REJECTION_REASON.NO_BILL_FOUND);
    }

    log.info(
      {
        id: bill.id,
        title: bill.title,
      },
      'found bill',
    );
    return {
      ...bill,
      // @ts-expect-error - I know what I'm doing
      content: Buffer.from(bill.content).toString('utf-8'),
    };
  }

  const billIds = await (async () => {
    if (billTitleResult.names.length > 0) {
      const loweredTitles = billTitleResult.names.map(title =>
        title.toLowerCase(),
      );
      log.debug(loweredTitles);
      const billSearch = await db
        .select({ id: billDbSchema.id })
        .from(billDbSchema)
        .where(inArray(sql`LOWER(${billDbSchema.title})`, loweredTitles))
        .limit(LIMIT);

      return billSearch.map(row => row.id);
    }
    return [];
  })();

  log.info(
    {
      size: billIds.length,
    },
    `Found ${billIds.length} bill IDs.`,
  );

  // we got bills from the title, we can just return the first one
  if (billIds.length > 0) {
    const _bill = await db
      .select({
        id: billDbSchema.id,
        title: billDbSchema.title,
        content: billDbSchema.content,
        number: billDbSchema.number,
        congress: billDbSchema.congress,
        type: billDbSchema.type,
        introducedDate: billDbSchema.introducedDate,
      })
      .from(billDbSchema)
      .where(inArray(billDbSchema.id, billIds))
      .limit(1);

    const bill = _bill[0];
    log.info(
      {
        id: bill.id,
        title: bill.title,
      },
      'found bill',
    );

    return {
      ...bill,
      // @ts-expect-error - I know what I'm doing
      content: Buffer.from(bill.content).toString('utf-8'),
    };
  }

  const embeddingsForKeywords = await pMap(
    billTitleResult.keywords,
    async term => {
      const termEmbedding = await generateEmbedding(term);
      return JSON.stringify(termEmbedding);
    },
    {
      concurrency: 5,
    },
  );
  log.info({}, `Found ${embeddingsForKeywords.length} embeddings.`);

  const searchPromises = embeddingsForKeywords.map(
    async termEmbeddingString => {
      const embeddingsQuery = db
        .select({
          text: billDbSchema.summary,
          billId: billVector.bill,
          distance: sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString}))`,
          title: billDbSchema.title,
        })
        .from(billVector)
        .where(
          and(
            sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
            isNotNull(billVector.bill),
            eq(billDbSchema.congress, ACTIVE_CONGRESS),
          ),
        )
        .orderBy(
          sql`vector_distance_cos(${billVector.vector}, vector32(${termEmbeddingString})) ASC`,
        )
        .leftJoin(billDbSchema, eq(billDbSchema.id, billVector.bill))
        .limit(LIMIT);

      return embeddingsQuery;
    },
  );

  const searchResults = (
    await pMap(searchPromises, searchPromise => searchPromise, {
      concurrency: 5,
    })
  ).flat();
  log.info(
    { size: searchResults.length },
    `Found ${searchResults.length} vector search results.`,
  );

  const uniqueBillIds = new Set<string>();
  const uniqueSearchResults = searchResults.filter(({ billId }) => {
    if (billId === null) return false;
    if (uniqueBillIds.has(billId)) return false;
    uniqueBillIds.add(billId);
    return true;
  });

  log.info(
    { all: searchResults.length, unique: uniqueSearchResults.length },
    'removed duplicates',
  );

  const baseText = uniqueSearchResults
    .map(({ title, text, billId }) => {
      return `billId: "${billId}" Bill Title: "${title}"\nText:\n"${text}"`;
    })
    .join('\n\n');

  const { object: relatedBills } = await generateObject({
    model: openai('gpt-4o'),
    seed: SEED,
    temperature: TEMPERATURE,
    schemaName: 'billRelatedToTweet',
    schema: z.object({
      billIds: z.array(z.string()).nullish(),
    }),
    schemaDescription: 'List of billIds related to the tweet.',
    messages: [
      {
        role: 'system',
        content: BILL_RELATED_TO_TWEET_PROMPT,
      },
      {
        role: 'user',
        content: `Tweet: ${messages.map(m => m.content).join('\n')}\n\nBills: ${baseText}`,
      },
    ],
  });

  if (!relatedBills.billIds?.length) {
    log.warn({}, 'No bill related to tweet.');
    throw new Error(REJECTION_REASON.UNRELATED_BILL);
  }

  log.info(
    { size: relatedBills.billIds.length },
    `related bills found: ${relatedBills.billIds.length}`,
  );

  // just got one bill return that
  if (relatedBills.billIds.length === 1) {
    const bill = await db.query.bill.findFirst({
      columns: {
        id: true,
        title: true,
        content: true,
        number: true,
        congress: true,
        type: true,
        introducedDate: true,
      },
      where: eq(billDbSchema.id, relatedBills.billIds[0]),
    });

    if (!bill) {
      log.error({}, 'bill not found');
      throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
    }

    log.info(
      {
        id: bill.id,
        title: bill.title,
      },
      'found bill',
    );
    return {
      ...bill,
      // @ts-expect-error - I know what I'm doing
      content: Buffer.from(bill.content).toString('utf-8'),
    };
  }

  const finalBill = await generateText({
    model: openai('gpt-4o'),
    seed: SEED,
    temperature: TEMPERATURE,
    tools: {
      searchEmbeddings: tool({
        description:
          'Find similar bills based on the text. Return up to 5 bills.',
        parameters: z.object({
          text: z.string(),
        }),
        execute: async ({ text }) => {
          const embedding = await generateEmbedding(text);
          const embeddingArrayString = JSON.stringify(embedding);
          const filters = [
            sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) < ${VECTOR_SEARCH_MATCH_THRESHOLD}`,
            isNotNull(billVector.bill),
            eq(billDbSchema.congress, ACTIVE_CONGRESS),
          ];

          if (relatedBills?.billIds) {
            filters.push(inArray(billVector.bill, relatedBills.billIds));
          }

          const vectorSearch = await db
            .select({
              billId: billVector.bill,
              text: billVector.text,
            })
            .from(billVector)
            .where(and(...filters))
            .orderBy(
              sql`vector_distance_cos(${billVector.vector}, vector32(${embeddingArrayString})) ASC`,
            )
            .limit(LIMIT);

          const results = vectorSearch.map(row => {
            return {
              billId: row.billId,
              text: row.text,
            };
          });

          return results;
        },
      }),
    },
    messages: [
      {
        role: 'system',
        content: `Analyze the text and identify the exact bill mentioned. Return ONLY the single corresponding "billId" from the database. If uncertain or no exact match is found, respond with 'NO_EXACT_MATCH'. Do not provide any additional commentary.`,
      },
      {
        role: 'user',
        content: `startingPoint: ${baseText}\n\nText: ${billTitleResult.names.join('\n')} ${billTitleResult.keywords.join('\n')}`,
      },
    ],
    maxSteps: 10,
  });

  const finalBillId = finalBill.text;
  if (
    finalBillId.startsWith('NO_TITLE_FOUND') ||
    finalBillId.startsWith('NO_EXACT_MATCH')
  ) {
    log.warn({}, 'no bill titled matched');
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  const bill = await db.query.bill.findFirst({
    columns: {
      id: true,
      title: true,
      content: true,
      number: true,
      congress: true,
      type: true,
      introducedDate: true,
    },
    where: eq(billDbSchema.id, finalBillId),
  });

  if (!bill) {
    log.error({}, 'bill not found');
    throw new Error(REJECTION_REASON.NO_EXACT_MATCH);
  }

  log.info(
    {
      id: bill.id,
      title: bill.title,
    },
    'found bill',
  );
  return {
    ...bill,
    // @ts-expect-error - I know what I'm doing
    content: Buffer.from(bill.content).toString('utf-8'),
  };
}

export async function getKbContext(
  {
    messages,
    text,
    manualEntries,
    documentEntries,
    billEntries,
    openaiApiKey,
  }: {
    messages: CoreMessage[];
    text: string;
    /** Should we search for manual entries from Web UI? */
    manualEntries: false | 'agent' | 'chat';
    /** Should we search for web pages scraped? */
    documentEntries: boolean;
    /** Should we search for bills scraped? */
    billEntries: boolean;
    openaiApiKey: string;
  },
  logger: WithLogger,
) {
  const termEmbedding = await generateEmbedding(text);
  const termEmbeddingString = JSON.stringify(termEmbedding);

  const manual = manualEntries
    ? await getManualKbDocuments(
        { termEmbeddingString, kbSourceType: manualEntries },
        logger,
      ).catch(_ => null)
    : null;
  const documents = documentEntries
    ? await getDocumentContext(
        { messages, termEmbeddingString, openaiApiKey },
        logger,
      ).catch(_ => null)
    : null;
  const bill = billEntries
    ? await getReasonBillContext({ messages, openaiApiKey }, logger).catch(
        _ => null,
      )
    : null;

  return {
    documents,
    manualEntries: manual,
    bill,
  };
}
