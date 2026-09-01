import type ParseStepBase from "./ParseStepBase";

/** A parse step that captures a numeric value. */
type ParseNumber = Readonly<ParseStepBase & {
  kind:'number',
  variableId:string
}>

export default ParseNumber;