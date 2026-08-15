import SourceLineMap from "../importing/types/SourceLineMap";
import ParseErrorEvent from "./types/ParseErrorEvent";
import { findLineLength, FIRST_SECTION_LINE, FULL_LINE_MATCH, matchLine, ROOT_LEVEL } from "./sourceLocationUtil";
import { describeParseError } from "./errorDescriptionUtil";

class ErrorCollector {
  private _sourceText:string;
  private _nextSourceFilename:string|null;
  private _nextSourceLineNo:number|null;
  private _nextFromCharNo:number;
  private _nextToCharNo:number;
  private _sourceLineMap:SourceLineMap;
  private _parseErrorEvents:ParseErrorEvent[];

  constructor(sourceText:string, sourceLineMap:SourceLineMap) {
    this._sourceText = sourceText;
    this._sourceLineMap = sourceLineMap;
    this._nextSourceFilename = this._nextSourceLineNo = null;
    this._nextFromCharNo = this._nextToCharNo = 0;
    this._parseErrorEvents = [];
  }

  public get count():number { return this._parseErrorEvents.length }

  public get hasErrors():boolean { return this._parseErrorEvents.length > 0; }

  public matchNextLine(sectionNames:string|string[] = ROOT_LEVEL, lineCriteria:string = FIRST_SECTION_LINE, 
      charRangeCriteria:string = FULL_LINE_MATCH) {
    if (typeof sectionNames === 'string') sectionNames = [sectionNames];
    const { sourceFilename, sourceLineNo, fromCharNo, toCharNo } = matchLine(this._sourceText, sectionNames, 
      this._sourceLineMap, lineCriteria, charRangeCriteria);
    this._nextSourceFilename = sourceFilename;
    this._nextSourceLineNo = sourceLineNo;
    this._nextFromCharNo = fromCharNo;
    this._nextToCharNo = toCharNo;
  }

  public setNextLine(lineI:number, fromCharNo:number = -1, toCharNo:number = -1) {
    const { filename, lineNo:sourceLineNo } = this._sourceLineMap[lineI];
    this._nextSourceFilename = filename;
    this._nextSourceLineNo = sourceLineNo;
    this._nextFromCharNo = fromCharNo < 0 ? 0 : fromCharNo;
    this._nextToCharNo = toCharNo < 0 ? findLineLength(this._sourceText, lineI) : toCharNo;
  }

  public setNextCharRange(fromCharNo:number, toCharNo:number) {
    this._nextFromCharNo = fromCharNo;
    this._nextToCharNo = toCharNo;
  }

  public add(message:string) {
    if (!this._nextSourceFilename || !this._nextSourceLineNo) throw Error('Call setLine() first.');
    const event:ParseErrorEvent = {
      sourceFilename:this._nextSourceFilename, sourceLineNo:this._nextSourceLineNo,
      fromCharNo:this._nextFromCharNo, toCharNo:this._nextToCharNo, message
    }
    this._parseErrorEvents.push(event);
  }

  public addAt(message:string, sectionNames:string|string[] = ROOT_LEVEL, lineCriteria:string = FIRST_SECTION_LINE, 
      charRangeCriteria:string = FULL_LINE_MATCH) {
    this.matchNextLine(sectionNames, lineCriteria, charRangeCriteria);
    this.add(message);
  }

  public addAtLine(message:string, lineI:number, fromCharNo:number = -1, toCharNo:number = -1) {
    this.setNextLine(lineI, fromCharNo, toCharNo);
    this.add(message);
  }

  public describeErrors():string {
    if (!this._parseErrorEvents.length) return '';
    const messages = this._parseErrorEvents.map(describeParseError);
    return messages.join('\n');
  }
}

export default ErrorCollector;