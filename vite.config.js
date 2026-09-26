import { defineConfig } from 'vite';
import { resolve } from 'path';
import expressApp from './api/index.js';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        adminLogin: resolve(__dirname, 'admin-login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
  plugins: [
    {
      name: 'api-middleware',
      configureServer(server) {
        // Forward requests starting with /api to our Express backend
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/api')) {
            expressApp(req, res, next);
          } else {
            next();
          }
        });
      },
    },
  ],
});
