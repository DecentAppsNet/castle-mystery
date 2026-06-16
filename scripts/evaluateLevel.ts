/// <reference types="node" />

/* CLI for the level "fitness" scorer used by the generative level designer (see
  docs/design/world-gen-generative-level-design.md). For each requested level (or every level in
  levels.md when none are given) it loads the level, runs the solver, and prints the machine-readable
  LevelFitness JSON — the structural gate booleans plus integer complexity aggregates. This is the
  structural oracle the multi-agent generator consumes; the semantic oracle (/world-test) is separate.

  Pass --out <file> to also write the JSON. Exits non-zero if any level fails to load or fails the
  structural gates, so it can back a pre-commit hook.

  Run via vite-node so @/ aliases and the level loader resolve exactly as in the app:
    npm run evaluate -- 01_birth_of_constantine.md
    npm run evaluate -- _gen.candidate.md --out fitness.json */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { setSeed } from '@/common/randUtil';
import { solveLevel } from '@/solver/solverUtil';
import { buildLevelFitness } from '@/solver/fitnessUtil';
import { loadLevelFromFile, loadLevelManifestFilenames } from './helpers/levelFileUtil.ts';

// Match the deterministic RNG the app uses when served locally, so generated movement (and thus the
// derived complexity) is reproducible regardless of which levels are scored or in what order.
const EVALUATE_SEED = 0;

type EvaluateArgs = { filenames:string[], outPath:string|null };

function _parseArgs(argv:string[]):EvaluateArgs {
  const filenames:string[] = [];
  let outPath:string|null = null;
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg === '--out') { outPath = argv[++i] ?? null; continue; }
    if (arg.startsWith('--out=')) { outPath = arg.slice('--out='.length); continue; }
    filenames.push(arg);
  }
  return { filenames, outPath };
}

async function _run():Promise<void> {
  const { filenames, outPath } = _parseArgs(process.argv.slice(2));
  const targets = filenames.length ? filenames : await loadLevelManifestFilenames();

  const results:Array<Record<string, unknown>> = [];
  let failedCount = 0;
  for (const filename of targets) {
    try {
      setSeed(EVALUATE_SEED);
      const level = await loadLevelFromFile(filename);
      const fitness = buildLevelFitness(solveLevel(level, filename));
      results.push({ loaded:true, ...fitness });
      if (!fitness.gates.ok) ++failedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ loaded:false, levelName:filename, error:message });
      ++failedCount;
    }
  }

  const json = `${JSON.stringify(results, null, 2)}\n`;
  process.stdout.write(json);
  if (outPath) {
    const resolvedOutPath = path.resolve(process.cwd(), outPath);
    await writeFile(resolvedOutPath, json);
    process.stdout.write(`Wrote fitness for ${results.length} level(s) to ${resolvedOutPath}.\n`);
  }

  if (failedCount > 0) process.exitCode = 1;
}

await _run().catch((error:unknown) => {
  const errorText = error instanceof Error ? error.message : 'Unknown error.';
  console.error(errorText);
  process.exitCode = 1;
});
