import type ParseStep from "./ParseStep";
import type ParseStepBase from "./ParseStepBase";

/** A parse step matching its child steps in order. */
type ParseSequence = Readonly<ParseStepBase & {
  kind:'sequence',
  children:ParseStep[]
}>

export default ParseSequence;