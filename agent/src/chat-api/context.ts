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

export const DAILY_MESSAGE_LIMIT_DEFUALT = 20;
export const userMeta = z
  .object({
    perDayLimit: z.number().optional().default(DAILY_MESSAGE_LIMIT_DEFUALT),
  })
  .optional()
  .default({
    perDayLimit: DAILY_MESSAGE_LIMIT_DEFUALT,
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

    const meta = userMeta.parse(user?.meta || {});
    if (user) return { ...user, meta };
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
    const meta = userMeta.parse(newUser?.meta || {});
    return { ...newUser, meta };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'unable to create user',
      requestId,
    );
  }
}
