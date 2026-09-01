import ImportedLine from "./ImportedLine";
import SourceLine from "./SourceLine";

/** A markdown section tree node retaining source-mapped heading and body lines. */
type ImportedSection = {
  headingText:string,
  normalizedHeading:string,
  depth:number,
  headingSourceLine:SourceLine,
  bodyLines:ImportedLine[],
  children:ImportedSection[]
};

export default ImportedSection;