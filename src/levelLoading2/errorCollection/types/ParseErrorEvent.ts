type ParseErrorEvent = {
  sourceFilename:string,
  sourceLineNo:number,
  fromCharNo:number,
  toCharNo:number,
  errorCode:string,
  expectedText:string,
  foundText:string,
  note:string
}

export default ParseErrorEvent;