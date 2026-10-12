/* Agent, do not modify this file without discussion with user. */
/* This file runs fixed baseline checks and captures their output in project-local logs.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const checks = [
  { script:'build', log:'last-build-output.txt' },
  { script:'test:all', log:'last-test-all-output.txt' },
  { script:'check:unused', log:'last-check-unused-output.txt' }
] as const;

async function _runCheck(script:string, logPath:string):Promise<number> {
  const outputFile = openSync(logPath, 'w');
  try {
    writeSync(outputFile, `Executing: npm run ${script}\n`);
    return await new Promise<number>(resolve => {
      const child = spawn('npm', ['run', script], {
        cwd:projectDirectory,
        shell:false,
        stdio:['ignore', outputFile, outputFile]
      });
      child.on('error', error => writeSync(outputFile, `Could not start command: ${error.message}\n`));
      child.on('close', (code, signal) => {
        if (signal) writeSync(outputFile, `Command terminated by signal ${signal}.\n`);
        resolve(code ?? 1);
      });
    });
  } finally {
    closeSync(outputFile);
  }
}

async function _main():Promise<void> {
  if (process.argv.length !== 2) throw new Error('check:baseline accepts no command-line arguments.');
  const packageDefinition = JSON.parse(readFileSync(join(projectDirectory, 'package.json'), 'utf8')) as {
    scripts:{ [name:string]:string|undefined }
  };
  const logDirectory = join(projectDirectory, 'tempTests');
  mkdirSync(logDirectory, { recursive:true });
  for (const check of checks) {
    writeFileSync(join(logDirectory, check.log), 'Not run in the current baseline invocation.\n');
  }

  for (const [checkI, check] of checks.entries()) {
    console.log(`Executing: npm run ${check.script}`);
    console.log(`Command: ${packageDefinition.scripts[check.script] ?? '(script missing)'}`);
    const exitCode = await _runCheck(check.script, join(logDirectory, check.log));
    console.log(exitCode === 0 ? 'Result: passed' : `Result: FAILED (exit code ${exitCode})`);
    console.log(`Check tempTests/${check.log} for ${exitCode === 0 ? 'full output and warnings' : 'more info'}.`);
    if (exitCode !== 0) {
      const skipped = checks.slice(checkI + 1).map(nextCheck => nextCheck.script);
      if (skipped.length) console.log(`Baseline stopped; not run: ${skipped.join(', ')}.`);
      process.exitCode = exitCode;
      return;
    }
  }
}

_main().catch(error => {
  console.error(`Baseline failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});