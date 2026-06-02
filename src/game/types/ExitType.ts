/* This module groups authored exit-type values used by room exits and related gameplay logic.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const ExitType = {
  doorway:'doorway',
  door:'door',
  lockableDoor:'lockableDoor'
} as const;

type ExitType = typeof ExitType[keyof typeof ExitType];

export default ExitType;
