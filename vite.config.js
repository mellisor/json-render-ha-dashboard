import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      {
        name: 'ha-dashboard-api',
        configureServer(server) {
          server.middlewares.use('/api/generate-ui', async (req, res) => {
            if (req.method !== 'POST') {
              res.writeHead(405);
              res.end();
              return;
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());

            // Lazily import so the Vite plugin doesn't hold onto module state
            const { catalog } = await import('./src/dashboard/catalog.js');
            const { default: Anthropic } = await import('@anthropic-ai/sdk');

            const apiKey = env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env' }));
              return;
            }

            const client = new Anthropic({ apiKey });
            const systemPrompt = catalog.prompt();

            // useUIStream sends { prompt, context, currentSpec }.
            // currentSpec is seeded from context.previousSpec when refining.
            const { prompt, currentSpec } = body;
            const isRefinement = currentSpec?.root && Object.keys(currentSpec.elements ?? {}).length > 0;

            const userMessage = isRefinement
              ? [
                  'EXISTING DASHBOARD SPEC (patch this — do not rebuild from scratch):',
                  JSON.stringify(currentSpec),
                  '',
                  'USER REQUEST:',
                  prompt,
                ].join('\n')
              : prompt;

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Transfer-Encoding', 'chunked');

            try {
              const stream = client.messages.stream({
                model: 'claude-sonnet-4-6',
                max_tokens: 8192,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
              });

              for await (const event of stream) {
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  res.write(event.delta.text);
                }
              }
            } catch (err) {
              res.write(`\n${JSON.stringify({ error: err.message })}`);
            } finally {
              res.end();
            }
          });
        },
      },
    ],
    server: { port: 5173 },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts', 'vue-echarts'],
            'json-render': ['@json-render/core', '@json-render/vue'],
            vue: ['vue'],
          },
        },
      },
    },
  };
});
