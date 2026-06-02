/* This module groups authored exit-status values used by rooms, exits, and runtime state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const ExitStatus = {
  open:'open',
  closed:'closed',
  locked:'locked',
  unlocked:'unlocked'
} as const;

type ExitStatus = typeof ExitStatus[keyof typeof ExitStatus];

export default ExitStatus;
