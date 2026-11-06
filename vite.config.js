import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Keep public/ as a directory in the generated site. The identical paths also
  // exist when GitHub Pages serves the repository's main branch directly.
  publicDir: false,
  build: { rollupOptions: { input: 'game.html' } },
  plugins: [{
    name: 'source-entry-for-development',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/' || url.pathname === '/index.html') {
          request.url = '/game.html' + url.search;
        }
        next();
      });
    },
  }],
});
