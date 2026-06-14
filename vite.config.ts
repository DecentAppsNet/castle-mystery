import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// `npm run dev-gen` only: serve a JSON list of the *.md candidate levels under public/levels/_gen/ so
// the app can show them (prefixed "(GEN) ") in the level selector for manual verification. Read fresh
// per request, so a newly generated candidate appears on a browser refresh without restarting the dev
// server. The listed files themselves are served by Vite's normal public-dir handling at
// /levels/_gen/<file>. This plugin is registered only when mode === 'dev-gen' (see plugins below), so
// plain `npm run dev` and production builds never expose _gen.
function genLevelsIndexPlugin():Plugin {
  return {
    name: 'gen-levels-index',
    configureServer(server:ViteDevServer) {
      server.middlewares.use('/levels/_gen-index.json', (_req, res) => {
        const genDir = path.resolve(process.cwd(), 'public/levels/_gen');
        let filenames:string[] = [];
        try { filenames = fs.readdirSync(genDir).filter(name => name.endsWith('.md')); } catch { /* no _gen dir */ }
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
