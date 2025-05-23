import * as readline from 'node:readline/promises';
import { userMeta } from '../chat-api/context';
import { ChatDbInstance } from '../chat-api/queries';
import { UserChatDb } from '../chat-api/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const privyId = await terminal.question('Please enter your Privy ID: ');

    if (!privyId) {
      console.error('Privy ID is required');
      return;
    }

    const dbUser = await ChatDbInstance.query.UserChatDb.findFirst({
      where: eq(UserChatDb.privyId, privyId),
    });

    if (!dbUser) {
      console.error('User not found');
      return;
    }

    const meta = userMeta.parse(dbUser?.meta || {});

    console.log('Current daily message limit:', meta.perDayLimit);

    // ask user for new limit
    const newLimit = await terminal.question(
      'Please enter your new daily message limit: ',
    );

    if (!newLimit) {
      console.error('New limit is required');
      return;
    }

    const parsedLimit = parseInt(newLimit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      console.error('Invalid limit. Please enter a positive number.');
      return;
    }

    // update user limit in DB
    try {
      const newMeta = userMeta.parse({
        ...meta,
        perDayLimit: parsedLimit,
      });
      await ChatDbInstance.update(UserChatDb)
        .set({ meta: Buffer.from(JSON.stringify(newMeta)) })
        .where(eq(UserChatDb.privyId, privyId));
      console.log('User limit updated successfully');
    } catch (error) {
      console.error('Error updating user limit:', error);
    }
  } finally {
    terminal.close();
  }
}

main().catch(console.error);
