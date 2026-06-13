/// <reference types="node" />

/* CLI for the level solver (see docs/adr-solver.md). For each requested level (or every level in
  levels.md when none are given) it prints the ASCII co-presence graph + reachability, and exits
  non-zero if any level has unreachable characters — so it can back a pre-commit hook. Pass --json
  to also print the machine-readable payload, or --out <file> to write it for a future validator.

  Run via vite-node so @/ aliases and the level loader resolve exactly as they do in the app:
    npm run solve -- 01_birth_of_constantine.md --json */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { setSeed } from '@/common/randUtil';
import { characterGraphToJsonObject } from '@/solver/graphSerializeUtil';
import { solveLevel } from '@/solver/solverUtil';
import { loadLevelFromFile, loadLevelManifestFilenames } from './helpers/levelFileUtil.ts';

// Match the deterministic RNG the app uses when served locally, so generated movement (and thus
// the co-presence graph) is reproducible regardless of which levels are solved or in what order.
const SOLVE_SEED = 0;

type SolveArgs = { filenames:string[], json:boolean, outPath:string|null };

function _parseArgs(argv:string[]):SolveArgs {
  const filenames:string[] = [];
  let json = false, outPath:string|null = null;
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg === '--json') { json = true; continue; }
    if (arg === '--out') { outPath = argv[++i] ?? null; continue; }
    if (arg.startsWith('--out=')) { outPath = arg.slice('--out='.length); continue; }
    filenames.push(arg);
  }
  return { filenames, json, outPath };
}

async function _run():Promise<void> {
  const { filenames, json, outPath } = _parseArgs(process.argv.slice(2));
  const targets = filenames.length ? filenames : await loadLevelManifestFilenames();

  const jsonResults:Array<ReturnType<typeof characterGraphToJsonObject> | { level:string, error:string }> = [];
  let failedCount = 0;
  for (const filename of targets) {
    try {
      setSeed(SOLVE_SEED);
      const level = await loadLevelFromFile(filename);
      const result = solveLevel(level, filename);
      process.stdout.write(`${result.asciiArt}\n`);
      if (!result.reachability.ok) ++failedCount;
      jsonResults.push(characterGraphToJsonObject(result.graph, result.levelName, result.reachability));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`${filename}\n  FAILED TO LOAD: ${message}\nRESULT: FAIL\n\n`);
      ++failedCount;
      jsonResults.push({ level:filename, error:message });
    }
  }

  if (json) process.stdout.write(`${JSON.stringify(jsonResults, null, 2)}\n`);
  if (outPath) {
    const resolvedOutPath = path.resolve(process.cwd(), outPath);
    await writeFile(resolvedOutPath, `${JSON.stringify(jsonResults, null, 2)}\n`);
    process.stdout.write(`Wrote JSON for ${jsonResults.length} level(s) to ${resolvedOutPath}.\n`);
  }

  if (failedCount > 0) {
    process.stdout.write(`\n${failedCount} of ${targets.length} level(s) failed (unreachable characters or load error).\n`);
    process.exitCode = 1;
  }
}

await _run().catch((error:unknown) => {
  const errorText = error instanceof Error ? error.message : 'Unknown error.';
  console.error(errorText);
  process.exitCode = 1;
});
