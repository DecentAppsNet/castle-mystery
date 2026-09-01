import type ParseStep from "./ParseStep";
import type ParseStepBase from "./ParseStepBase";

/** A parse step accepting one of several child alternatives. */
type ParseOptions = Readonly<ParseStepBase & {
  kind:'options',
  variableId:string|null,
  children:ParseStep[]
}>

export default ParseOptions;