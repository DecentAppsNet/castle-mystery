import type ParseIdentifier from "./ParseIdentifier";
import type ParseLiteral from "./ParseLiteral";
import ParseNumber from "./ParseNumber";
import type ParseOptions from "./ParseOptions";
import type ParseSequence from "./ParseSequence";
import type ParseText from "./ParseText";

type ParseStep = ParseSequence | ParseOptions | ParseLiteral | ParseText | ParseIdentifier | ParseNumber;

export default ParseStep;