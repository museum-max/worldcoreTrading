import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCliArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === flag && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith(`${flag}=`)) {
      return arg.slice(flag.length + 1);
    }
  }
  return undefined;
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cliPort = getCliArg('--port');
  const cliHost = getCliArg('--host');

  // In development, nginx occupies PORT (8080) and proxies to DEFAULT_APP_PORT (3000).
  const port = Number(
    cliPort ||
      (isProduction
        ? process.env.PORT || 3000
        : process.env.DEFAULT_APP_PORT || 3000)
  );
  const host = cliHost || '0.0.0.0';

  const app = express();
  app.use(express.json());

  // API routes
  app.use('/api', apiRouter);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`WORLCORE TRADE server running on http://${host}:${port} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting WORLCORE TRADE server:', err);
  process.exit(1);
});
