import { createClient } from '@libsql/client';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { CHAT_TURSO_AUTH_TOKEN, CHAT_TURSO_DATABASE_URL } from '../const';
import { ChatSDKError } from './errors';
import * as schema from './schema';

const client = createClient({
  url: CHAT_TURSO_DATABASE_URL,
  authToken: CHAT_TURSO_AUTH_TOKEN,
});
export const ChatDbInstance = drizzle({ client, schema });

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: Omit<InferSelectModel<typeof schema.ChatChatDb>, 'createdAt'>) {
  try {
    const [chat] = await ChatDbInstance.insert(schema.ChatChatDb)
      .values({
        id,
        title,
        userId,
        visibility,
      })
      .returning();

    return chat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to save chat: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function updateChatVisibility({
  id,
  visibility,
}: Pick<InferSelectModel<typeof schema.ChatChatDb>, 'visibility' | 'id'>) {
  try {
    const [chat] = await ChatDbInstance.update(schema.ChatChatDb)
      .set({
        visibility,
      })
      .where(eq(schema.ChatChatDb.id, id))
      .returning();

    return chat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to update chat visibility: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  const chat = await ChatDbInstance.query.ChatChatDb.findFirst({
    where: eq(schema.ChatChatDb.id, id),
  });

  if (chat) return chat;

  return null;
}

export async function saveMessages({
  messages,
}: {
  messages: Array<
    Omit<InferSelectModel<typeof schema.MessageChatDb>, 'createdAt'>
  >;
}) {
  return await ChatDbInstance.insert(schema.MessageChatDb)
    .values(
      messages.map(a => ({
        ...a,
        parts: Buffer.from(JSON.stringify(a.parts)),
      })),
    )
    .onConflictDoNothing({
      target: schema.MessageChatDb.id,
    });
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const messages = await ChatDbInstance.select()
      .from(schema.MessageChatDb)
      .where(eq(schema.MessageChatDb.chatId, id))
      .orderBy(asc(schema.MessageChatDb.createdAt));

    return messages.map(message => ({
      ...message,
      // @ts-expect-error - TODO: figure out best way to handle this
      parts: JSON.parse(Buffer.from(message.parts).toString('utf-8')),
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await ChatDbInstance.select()
      .from(schema.MessageChatDb)
      .where(eq(schema.MessageChatDb.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await ChatDbInstance.update(schema.ChatChatDb)
      .set({ visibility })
      .where(eq(schema.ChatChatDb.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    ).toUTCString();

    const [stats] = await ChatDbInstance.select({
      count: count(schema.MessageChatDb.id),
    })
      .from(schema.MessageChatDb)
      .innerJoin(
        schema.ChatChatDb,
        eq(schema.MessageChatDb.chatId, schema.ChatChatDb.id),
      )
      .where(
        and(
          eq(schema.ChatChatDb.userId, id),
          gte(schema.MessageChatDb.createdAt, twentyFourHoursAgo),
          eq(schema.MessageChatDb.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}
