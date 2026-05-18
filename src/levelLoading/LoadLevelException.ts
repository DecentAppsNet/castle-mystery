/* This module groups level-loading error context so parse and validation failures carry file and line information. */

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