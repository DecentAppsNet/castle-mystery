import type ParseStepBase from "./ParseStepBase";

/** A parse step that captures quoted text. */
type ParseText = Readonly<ParseStepBase & {
  kind:'text',
  variableId:string
}>

export default ParseText;