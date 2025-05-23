import { z } from 'zod';
import { ChatSDKError } from './errors';
import { ChatDbInstance } from './queries';
import { UserChatDb } from './schema';
import { eq } from 'drizzle-orm';
import { bento } from '../cache';

export const jwtSchema = z.object({
  sid: z.string(),
  iss: z.string(),
  iat: z.number(),
  aud: z.string(),
  sub: z.string(),
  exp: z.number(),
});

export const DAILY_MESSAGE_LIMIT_DEFUALT = 20;
export const userMeta = z.preprocess(
  input => {
    // If input is null/undefined, return undefined (schema's .optional() will handle default)
    if (input == null) {
      return undefined;
    }

    // handle buffer input
    if (input instanceof Buffer) {
      try {
        const parsed = JSON.parse(input.toString());
        return parsed;
      } catch (error) {
        console.warn('Failed to parse Buffer input:', error);
        return undefined; // Fallback to schema's default
      }
    }

    // If input is already an object, return it (avoids unnecessary parsing)
    if (typeof input === 'object') {
      return input;
    }

    // If input is a string, try to parse it as JSON
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return undefined; // Fallback to schema's default
      }
    }

    // For any other type, return undefined
    console.warn('Invalid input type for userMeta:', typeof input);
    return undefined;
  },
  z
    .object({
      perDayLimit: z.number().optional().default(DAILY_MESSAGE_LIMIT_DEFUALT),
    })
    .optional()
    .default({
      perDayLimit: DAILY_MESSAGE_LIMIT_DEFUALT,
    }),
);

function getUser({ privyId }: { privyId: string }) {
  return bento.getOrSet(
    `getPrivyUser_${privyId}`,
    async () => {
      const user = await ChatDbInstance.query.UserChatDb.findFirst({
        where: eq(UserChatDb.privyId, privyId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      const meta = userMeta.parse(user?.meta || {});

      return { ...user, meta };
    },
    { ttl: '1h' },
  );
}

export async function contextUser({
  privyId,
  requestId,
}: {
  privyId: string;
  requestId: string;
}) {
  // if user in DB return
  try {
    const user = await getUser({ privyId });
    return user;
  } catch (error) {
    console.log('user not found in db', error);
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
