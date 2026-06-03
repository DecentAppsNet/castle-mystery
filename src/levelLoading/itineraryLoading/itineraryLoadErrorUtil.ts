/* This module groups itinerary-loading error helpers that preserve level-file and line-number context.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { formatMsecsAsTimestamp } from "@/levelLoading/timestampUtil";

import LoadLevelException from "../LoadLevelException";

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown, errorTime?:number):never {
  const errorPrefix = errorTime === undefined ? '' : `At ${formatMsecsAsTimestamp(errorTime)}, `;
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, `${errorPrefix}${error.message}`, error);
  throw new LoadLevelException(levelFilename, errorLineNo, `${errorPrefix}${String(error)}`, error);
}

export function runWithItineraryLineContext<T>(levelFilename:string, errorLineNo:number, callback:() => T, errorTime?:number):T {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error, errorTime);
  }
}

export function throwWithItineraryLineContext(levelFilename:string, errorLineNo:number, error:unknown, errorTime?:number):never {
  return _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error, errorTime);
}