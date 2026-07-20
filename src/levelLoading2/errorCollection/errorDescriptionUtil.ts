import ParseErrorEvent from "./types/ParseErrorEvent";

export function describeParseError(error:ParseErrorEvent):string {
  const noteEnd:string = error.note === '' ? '' : ` ${error.note}`;
  const message = `Found "${error.foundText}" when expecting ${error.expectedText}.${noteEnd}`;
  return `${error.sourceFilename}:${error.sourceLineNo}:${error.fromCharNo}: ${message}`;
}