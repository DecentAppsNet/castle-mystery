/// <reference types="node" />

/* CLI for the level solver (see docs/adr-solver.md). For each requested level (or every level in
  levels.md when none are given) it prints the ASCII character co-presence graph + item-reachability
  graph + room-interaction cube, and exits non-zero if any level has unreachable characters or
  unreachable items — so it can back a pre-commit hook. Pass --json to also print the machine-readable
  payload, or --out <file> to write it for a future validator.

  The adjacency + item matrices always print inline (they carry the PASS/FAIL verdict). The room cube,
  which can be far wider than a terminal, is written to a temp file instead — with only its path
  printed — when it would wrap (stdout is a TTY narrower than the cube). Piped/redirected output is
  never diverted (there's nothing to wrap).

  Run via vite-node so @/ aliases and the level loader resolve exactly as they do in the app:
    npm run solve -- 01_birth_of_constantine.md --json */

import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { setSeed } from '@/common/randUtil';
import { characterGraphToJsonObject } from '@/solver/graphSerializeUtil';
import { itemGraphToJsonObject } from '@/solver/itemGraphSerializeUtil';
import { roomLayerViewToJsonObject } from '@/solver/roomLayerSerializeUtil';
import { transferCostTableToJsonObject } from '@/solver/transferCostSerializeUtil';
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

function _maxLineWidth(text:string):number {
  return text.split('\n').reduce((widest, line) => Math.max(widest, line.length), 0);
}

const FILENAME_SAFE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-';
function _toSafeFilenameSegment(name:string):string {
  return Array.from(name, ch => FILENAME_SAFE_CHARS.includes(ch) ? ch : '_').join('');
}

/* Prints the room-interaction cube, or — when it is wider than the terminal — writes just the cube to
  a temp file and prints that path in its place. The adjacency and item matrices (which carry the
  PASS/FAIL verdict) are always printed by the caller; only this wide diagnostic is ever diverted.
  stdout.columns is only defined for a TTY; piped/redirected output reports no width, so it is treated
  as unbounded and printed in full (nothing wraps a file or pipe). */
async function _emitRoomLayerCube(filename:string, roomLayerAscii:string):Promise<void> {
  const terminalColumns = process.stdout.isTTY ? (process.stdout.columns ?? Infinity) : Infinity;
  const cubeWidth = _maxLineWidth(roomLayerAscii);
  if (cubeWidth <= terminalColumns) { process.stdout.write(`${roomLayerAscii}\n`); return; }

  const outPath = path.join(os.tmpdir(), `castle-mystery-solve-${_toSafeFilenameSegment(filename)}.txt`);
  await writeFile(outPath, roomLayerAscii.endsWith('\n') ? roomLayerAscii : `${roomLayerAscii}\n`);
  process.stdout.write(`Room interaction cube is ${cubeWidth} cols wide — wider than this ${terminalColumns}-col terminal. Written to:\n`);
  process.stdout.write(`  ${outPath}\n\n`);
}

async function _run():Promise<void> {
  const { filenames, json, outPath } = _parseArgs(process.argv.slice(2));
  const targets = filenames.length ? filenames : await loadLevelManifestFilenames();

  const jsonResults:Array<(ReturnType<typeof characterGraphToJsonObject> & { items:ReturnType<typeof itemGraphToJsonObject>, transferCost:ReturnType<typeof transferCostTableToJsonObject>, roomLayers:ReturnType<typeof roomLayerViewToJsonObject> }) | { level:string, error:string }> = [];
  let failedCount = 0;
  for (const filename of targets) {
    try {
      setSeed(SOLVE_SEED);
      const level = await loadLevelFromFile(filename);
      const result = solveLevel(level, filename);
      process.stdout.write(`${result.analysisAscii}\n`); // Adjacency + item matrices + cost table always print inline.
      await _emitRoomLayerCube(filename, result.roomLayerAscii);
      if (!result.ok) ++failedCount;
      jsonResults.push({
        ...characterGraphToJsonObject(result.graph, result.levelName, result.reachability),
        items:itemGraphToJsonObject(result.itemGraph, result.levelName, result.itemReachability),
        transferCost:transferCostTableToJsonObject(result.transferCostTable, result.levelName),
        roomLayers:roomLayerViewToJsonObject(result.roomLayers, result.levelName)
      });
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
    process.stdout.write(`\n${failedCount} of ${targets.length} level(s) failed (unreachable characters or items, or load error).\n`);
    process.exitCode = 1;
  }
}

await _run().catch((error:unknown) => {
  const errorText = error instanceof Error ? error.message : 'Unknown error.';
  console.error(errorText);
  process.exitCode = 1;
});
