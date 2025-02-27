import { build } from 'esbuild';
import esbuildPluginPino from 'esbuild-plugin-pino';

async function main() {
  const status = await build({
    entryPoints: ['src/server.ts'],
    outdir: 'dist',
    bundle: true,
    platform: 'node',
    external: ['@libsql/client'],
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
  }).catch(() => process.exit(1));

  console.log(status);
  process.exit(0);
}

main().catch(console.error);
