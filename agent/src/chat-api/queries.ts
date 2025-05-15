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
    return await ChatDbInstance.insert(schema.ChatChatDb).values({
      id,
      title,
      userId,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await ChatDbInstance.select()
      .from(schema.ChatChatDb)
      .where(eq(schema.ChatChatDb.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<InferSelectModel<typeof schema.MessageChatDb>>;
}) {
  try {
    return await ChatDbInstance.insert(schema.MessageChatDb).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await ChatDbInstance.select()
      .from(schema.MessageChatDb)
      .where(eq(schema.MessageChatDb.chatId, id))
      .orderBy(asc(schema.MessageChatDb.createdAt));
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
