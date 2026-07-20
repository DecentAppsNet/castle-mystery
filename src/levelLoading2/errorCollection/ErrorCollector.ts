import SourceLineMap from "../importing/types/SourceLineMap";
import ParseErrorEvent from "./types/ParseErrorEvent";
import SectionIdToLineOffset from "./types/SectionIdToLineOffset";
import { findSourceLocation } from "./sourceLocationUtil";
import { describeParseError } from "./errorDescriptionUtil";

class ErrorCollector {
  private _sectionOffsets:SectionIdToLineOffset;
  private _nextSourceFilename:string|null;
  private _nextSourceLineNo:number|null;
  private _sourceLineMap:SourceLineMap;
  private _parseErrorEvents:ParseErrorEvent[];
  private _hasNewErrors:boolean;

  constructor(sectionOffsets:SectionIdToLineOffset, sourceLineMap:SourceLineMap) {
    this._sectionOffsets = sectionOffsets;
    this._sourceLineMap = sourceLineMap;
    this._nextSourceFilename = null;
    this._nextSourceLineNo = null;
    this._parseErrorEvents = [];
    this._hasNewErrors = false;
  }

  public resetNewErrors() { this._hasNewErrors = false; }

  public hasNewErrors() { return this._hasNewErrors; }

  public get sourceFilename():string|null { return this._nextSourceFilename; }

  public get sourceLineNo():number|null { return this._nextSourceLineNo; }
  
  public setLine(lineNo:number, sectionId:string|null = null) {
    const {sourceFilename, sourceLineNo} = findSourceLocation(lineNo, sectionId, this._sectionOffsets, this._sourceLineMap);
    this._nextSourceFilename = sourceFilename;
    this._nextSourceLineNo = sourceLineNo;
  }

  public addParseError(errorCode:string, expectedText:string, foundText:string, note:string, fromCharNo:number, toCharNo:number) {
    if (!this._nextSourceFilename || !this._nextSourceLineNo) throw Error('Call setLine() first.');
    const event:ParseErrorEvent = {
      sourceFilename:this._nextSourceFilename, sourceLineNo:this._nextSourceLineNo,
      fromCharNo, toCharNo, note, errorCode, expectedText, foundText
    }
    this._parseErrorEvents.push(event);
    this._hasNewErrors = true;
  }

  public addParseErrorAtLine(errorCode:string, expectedText:string, foundText:string, note:string, lineNo:number, fromCharNo:number, 
      toCharNo:number, sectionId:string|null = null) {
    const {sourceFilename, sourceLineNo} = findSourceLocation(lineNo, sectionId, this._sectionOffsets, this._sourceLineMap);
    const event:ParseErrorEvent = { sourceFilename, sourceLineNo, fromCharNo, toCharNo, note, errorCode, expectedText, foundText };
    this._parseErrorEvents.push(event);
    this._hasNewErrors = true;
  }

  public describeErrors():string {
    if (!this._parseErrorEvents.length) return '';
    const messages = this._parseErrorEvents.map(describeParseError);
    return messages.join('\n');
  }
}

export default ErrorCollector;