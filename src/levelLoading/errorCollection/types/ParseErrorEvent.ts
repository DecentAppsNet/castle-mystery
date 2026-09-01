/** A level parsing error with its original source and character range. */
type ParseErrorEvent = {
  sourceFilename:string,
  sourceLineNo:number,
  fromCharNo:number,
  toCharNo:number,
  message:string
}

export default ParseErrorEvent;