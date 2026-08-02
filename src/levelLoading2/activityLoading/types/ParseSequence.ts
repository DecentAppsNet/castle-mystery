import type ParseStep from "./ParseStep";
import type ParseStepBase from "./ParseStepBase";

type ParseSequence = Readonly<ParseStepBase & {
  kind:'sequence',
  children:ParseStep[]
}>

export default ParseSequence;