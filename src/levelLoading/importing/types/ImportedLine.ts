import SourceLine from "./SourceLine";

/** One imported text line paired with its original source location. */
type ImportedLine = {
  text:string,
  sourceLine:SourceLine
};

export default ImportedLine;