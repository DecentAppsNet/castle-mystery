import { assertNonNullable } from "decent-portal";
import SourceLineMap from "../importing/types/SourceLineMap";
import SectionIdToLineOffset from "./types/SectionIdToLineOffset";

export function findSourceLocation(lineNo:number, sectionId:string|null, sectionOffsets:SectionIdToLineOffset, 
    sourceLineMap:SourceLineMap):{sourceFilename:string, sourceLineNo:number} {
  
  const sectionLineOffset = sectionId === null ? 0 : sectionOffsets[sectionId] ?? null;
  assertNonNullable(sectionLineOffset, `Found no offset for section "${sectionId}".`);
  lineNo += sectionLineOffset;

  const sourceLine = sourceLineMap[lineNo];
  assertNonNullable(sourceLine, `sourceLineMap doesn't have mapping info for line #${lineNo}.`);
  return {sourceFilename:sourceLine.filename, sourceLineNo:sourceLine.lineNo};
}