import { MarkdownLineError } from "@/common/markdownUtil";
import LoadLevelException from "./LoadLevelException";

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown):never {
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof MarkdownLineError) throw new LoadLevelException(levelFilename, error.lineNo, error.message, error);
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, error.message, error);
  throw new LoadLevelException(levelFilename, errorLineNo, String(error), error);
}

export function runWithLevelFileContext(levelFilename:string, errorLineNo:number, callback:Function) {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error);
  }
}