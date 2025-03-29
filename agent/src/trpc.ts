import { initTRPC, TRPCError } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { CF_AUDIENCE, CF_TEAM_DOMAIN, IS_PROD } from './const';
import { logger } from './logger';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ManualKBInsertInput, postKbInsert } from './api/manual-kb';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const log = logger.child({
    requestId: req.id,
  });

  if (!IS_PROD) {
    return {
      requestId: req.id,
      userEmail: 'DEV_TESTING',
    };
  }

  const token = req.headers?.['cf-authorization-token'];

  // Your CF Access team domain
  const CERTS_URL = `${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const JWKS = createRemoteJWKSet(new URL(CERTS_URL));

  // Make sure that the incoming request has our token header
  if (!token || typeof token !== 'string') {
    log.error({}, 'missing required cf authorization token');
    return {
      requestId: req.id,
      userEmail: null,
    };
  }

  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: CF_TEAM_DOMAIN,
      audience: CF_AUDIENCE,
    });
    log.info({ result }, 'cf authorization token verified');
    return {
      requestId: req.id,
      userEmail: result.payload.email as string,
    };
  } catch (error) {
    log.error({ error }, 'invalid cf authorization token');
    return {
      requestId: req.id,
      userEmail: null,
    };
  }
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

    if (!ctx.userEmail) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return opts.next({
      ctx,
    });
  },
);

export const appRouter = router({
  secret: protectedProcedure.query(opts => {
    return {
      secret: 'sauce',
    };
  }),
  createKbEntry: protectedProcedure
    .input(ManualKBInsertInput)
    .mutation(async opts => {
      const log = logger.child({
        function: 'createKbEntry',
        requestId: opts.ctx.requestId,
      });
      const { title, content } = opts.input;
      const result = await postKbInsert({ title, content }, log);
      return result;
    }),
});

export type AppRouter = typeof appRouter;
