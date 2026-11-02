import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, serve the Vercel functions in /api through Vite so the site works locally.
function devApi(): Plugin {
  return {
    name: 'bloc-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        const name = req.url.slice(5).split('?')[0].replace(/[^a-z0-9-]/gi, '');
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          const method = (req.method || 'GET').toUpperCase();
          const handler = mod[method];
          if (!handler) { res.statusCode = 405; return res.end('method not allowed'); }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(`http://localhost${req.url}`, {
            method,
            headers: req.headers as Record<string, string>,
            body: method === 'GET' || method === 'HEAD' ? undefined : body,
          });
          const out: Response = await handler(request);
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  define: { global: 'globalThis' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
