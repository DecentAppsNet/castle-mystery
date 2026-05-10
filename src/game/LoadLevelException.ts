export default class LoadLevelException extends Error {
  readonly levelFilename:string;
  readonly errorLineNo:number;
  override readonly cause:unknown;

  constructor(levelFilename:string, errorLineNo:number, message:string, cause?:unknown) {
    super(`${levelFilename}:${errorLineNo}: ${message}`);
    this.name = 'LoadLevelException';
    this.levelFilename = levelFilename;
    this.errorLineNo = errorLineNo;
    this.cause = cause;
  }
}