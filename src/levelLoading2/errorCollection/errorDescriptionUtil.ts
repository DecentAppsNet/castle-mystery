import ParseErrorEvent from "./types/ParseErrorEvent";

export function describeParseError(error:ParseErrorEvent):string {
  return `${error.sourceFilename}:${error.sourceLineNo}:${error.fromCharNo}: ${error.message}`;
}