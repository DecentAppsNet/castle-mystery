/* This module groups shared filename validation helpers for authored content references.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

function _containsNonFilenameSyntax(filename:string):boolean {
  return filename.includes('/')
    || filename.includes('\\')
    || filename.includes('?')
    || filename.includes('#')
    || filename.includes(':')
    || filename.includes('%')
    || filename.includes('|');
}

export function validateFilename(filename:string, fieldName:string):void {
  if (!filename) throw new Error(`${fieldName} must be a filename`);
  if (_containsNonFilenameSyntax(filename)) {
    throw new Error(`${fieldName} must be a filename, not a path or URL`);
  }
}
