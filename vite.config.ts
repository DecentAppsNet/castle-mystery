import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// `npm run dev-gen` only: serve a JSON list of the flat _gen.*.md candidate levels under
// public/levels/ so the app can show them (prefixed "(GEN) ") in the level selector for manual
// verification. Read fresh per request, so a newly generated candidate appears on a browser refresh
// without restarting the dev server. The files are served by Vite's normal public-dir handling at
// /levels/_gen.<file> — flat (no subdirectory) so they round-trip through the app's filename-based
// level loader. Registered only when mode === 'dev-gen' (see plugins below), so plain `npm run dev`
// and production builds never expose them.
function genLevelsIndexPlugin():Plugin {
  return {
    name: 'gen-levels-index',
    configureServer(server:ViteDevServer) {
      server.middlewares.use('/levels/_gen-index.json', (_req, res) => {
        const levelsDir = path.resolve(process.cwd(), 'public/levels');
        let filenames:string[] = [];
        try { filenames = fs.readdirSync(levelsDir).filter(name => name.startsWith('_gen.') && name.endsWith('.md')); } catch { /* no levels dir */ }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filenames));
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), ...(mode === 'dev-gen' ? [genLevelsIndexPlugin()] : [])],
    css: {
      modules: {
        scopeBehaviour: 'local',
      }
    },
    server: { port: 3000 },
    resolve: {
      alias: { '@': '/src' }
    },
    build: { 
      sourcemap: true, 
      manifest: true,
      chunkSizeWarningLimit: 7000,
    },
    test: {
      environment: 'node',
      globals: true,
      coverage: {
        exclude: [
          '**/*.tsx',
          '**/interactions/**'
        ]
      }
    }
  };
});
