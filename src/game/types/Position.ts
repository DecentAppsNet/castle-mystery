/* This module groups the shared position model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

type Position = {
  x: number,
  y: number,
  z: number
}

export function duplicatePosition(from:Position):Position {
  return {...from};
}

export default Position;
