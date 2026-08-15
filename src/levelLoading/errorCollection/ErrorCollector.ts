import SourceLineMap from "../importing/types/SourceLineMap";
import ParseErrorEvent from "./types/ParseErrorEvent";
import { findLineLength, FIRST_SECTION_LINE, FULL_LINE_MATCH, matchLine, ROOT_LEVEL } from "./sourceLocationUtil";
import { describeParseError } from "./errorDescriptionUtil";

class ErrorCollector {
  private _sourceText:string;
  private _sourceLineMap:SourceLineMap;
  private _parseErrorEvents:ParseErrorEvent[];

  constructor(sourceText:string, sourceLineMap:SourceLineMap) {
    this._sourceText = sourceText;
    this._sourceLineMap = sourceLineMap;
    this._parseErrorEvents = [];
  }

  public get count():number { return this._parseErrorEvents.length }

  public get hasErrors():boolean { return this._parseErrorEvents.length > 0; }

  private _add(message:string, sourceFilename:string, sourceLineNo:number, fromCharNo:number, toCharNo:number) {
    const event:ParseErrorEvent = {
      sourceFilename, sourceLineNo, fromCharNo, toCharNo, message
    }
    this._parseErrorEvents.push(event);
  }

  public addAt(message:string, sectionNames:string|string[] = ROOT_LEVEL, lineCriteria:string = FIRST_SECTION_LINE, 
      charRangeCriteria:string = FULL_LINE_MATCH) {
    const location = matchLine(this._sourceText, sectionNames, this._sourceLineMap, lineCriteria, charRangeCriteria);
    this._add(message, location.sourceFilename, location.sourceLineNo, location.fromCharNo, location.toCharNo);
  }

  public addAtCharRange(message:string, sectionNames:string|string[], lineCriteria:string,
      fromCharNo:number, toCharNo:number) {
    const location = matchLine(this._sourceText, sectionNames, this._sourceLineMap, lineCriteria, FULL_LINE_MATCH);
    this._add(message, location.sourceFilename, location.sourceLineNo, fromCharNo, toCharNo);
  }

  public addAtLine(message:string, lineI:number, fromCharNo:number = -1, toCharNo:number = -1) {
    const { filename, lineNo:sourceLineNo } = this._sourceLineMap[lineI];
    const resolvedFromCharNo = fromCharNo < 0 ? 0 : fromCharNo;
    const resolvedToCharNo = toCharNo < 0 ? findLineLength(this._sourceText, lineI) : toCharNo;
    this._add(message, filename, sourceLineNo, resolvedFromCharNo, resolvedToCharNo);
  }

  public describeErrors():string {
    if (!this._parseErrorEvents.length) return '';
    const messages = this._parseErrorEvents.map(describeParseError);
    return messages.join('\n');
  }
}

export default ErrorCollector;