type ParseErrorEvent = {
  sourceFilename:string,
  sourceLineNo:number,
  fromCharNo:number,
  toCharNo:number,
  message:string
}

export default ParseErrorEvent;