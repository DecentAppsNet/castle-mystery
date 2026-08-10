import ImportedLine from "./ImportedLine";
import SourceLine from "./SourceLine";

type ImportedSection = {
  headingText:string,
  normalizedHeading:string,
  depth:number,
  headingSourceLine:SourceLine,
  bodyLines:ImportedLine[],
  children:ImportedSection[]
};

export default ImportedSection;