import { initTRPC, TRPCError } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { IS_PROD, PRIVY_APP_ID } from '../const';
import { contextUser, jwtSchema } from './context';
import { normalizeHeaderValue } from '../utils/stream';
import { chatLogger } from '../logger';

export async function createContext({ req }: CreateFastifyContextOptions) {
  const requestId = normalizeHeaderValue(req.headers['x-request-id']) || req.id;

  const log = chatLogger.child({
    requestId,
  });

  if (!IS_PROD) {
    log.warn({}, 'Running in non-prod mode, skipping auth');
    const user = await contextUser({
      privyId: 'test-user',
      requestId,
    });
    // Skip auth in non-prod environments
    return {
      privyUserId: 'test-user',
      user,
      log,
    };
  }

  const token = req.headers?.['x-jwt-payload'];

  // Make sure that the incoming request has our JWT payload
  if (!token || typeof token !== 'string') {
    log.warn({}, 'missing JWT payload');
    return {
      privyUserId: null,
      user: null,
      log,
    };
  }

  // convert the base64 token to a string and parse with zod
  const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
  const parsedToken = jwtSchema.safeParse(JSON.parse(decodedToken));

  if (!parsedToken.success) {
    log.error({ error: parsedToken.error }, 'invalid JWT payload');
    return {
      privyUserId: null,
      user: null,
      log,
    };
  }

  // check for expiry
  if (parsedToken.data.exp < Date.now() / 1000) {
    log.error({}, 'JWT token expired');
    return {
      privyUserId: null,
      user: null,
      log,
    };
  }

  // check for audience
  if (parsedToken.data.aud !== PRIVY_APP_ID) {
    log.error({}, 'invalid JWT audience');
    return {
      privyUserId: null,
      user: null,
      log,
    };
  }

  log.info({ userId: parsedToken.data.sub }, 'valid JWT token');
  const privyId = parsedToken.data.sub;
  const user = await contextUser({
    privyId,
    requestId,
  });

  return {
    privyUserId: privyId,
    user,
    log,
  };
}

type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use<Context>(
  async function isAuthed(opts) {
    const { ctx } = opts;

    if (!ctx.privyUserId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return opts.next({
      ctx,
    });
  },
);
