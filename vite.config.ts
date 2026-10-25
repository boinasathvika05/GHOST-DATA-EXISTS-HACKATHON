import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'ghosttrace-api-plugin',
        async configureServer(server) {
          const { app } = await import('./server.ts');
          server.middlewares.use((req, res, next) => {
            // Forward /api requests to Express app
            if (req.url?.startsWith('/api')) {
              return app(req as any, res as any, next);
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
