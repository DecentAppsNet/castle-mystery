/* This file formats source-located level parsing errors for developer display.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ParseErrorEvent from "./types/ParseErrorEvent";

/** Formats one parse error as a source location followed by its message. */
export function describeParseError(error:ParseErrorEvent):string {
  return `${error.sourceFilename}:${error.sourceLineNo}:${error.fromCharNo}: ${error.message}`;
}