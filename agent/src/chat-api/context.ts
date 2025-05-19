import { z } from 'zod';
import { ChatSDKError } from './errors';
import { ChatDbInstance } from './queries';
import { UserChatDb } from './schema';
import { eq } from 'drizzle-orm';

export const jwtSchema = z.object({
  sid: z.string(),
  iss: z.string(),
  iat: z.number(),
  aud: z.string(),
  sub: z.string(),
  exp: z.number(),
});

export async function contextUser({
  privyId,
  requestId,
}: {
  privyId: string;
  requestId: string;
}) {
  // if user in DB return
  try {
    const user = await ChatDbInstance.query.UserChatDb.findFirst({
      where: eq(UserChatDb.privyId, privyId),
    });

    if (user) return user;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'unable to query user',
      requestId,
    );
  }

  // else create user in DB
  try {
    const [newUser] = await ChatDbInstance.insert(UserChatDb)
      .values({
        privyId,
      })
      .returning();
    return newUser;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'unable to create user',
      requestId,
    );
  }
}
