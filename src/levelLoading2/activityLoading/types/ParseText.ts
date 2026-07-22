import type ParseStepBase from "./ParseStepBase";

type ParseText = Readonly<ParseStepBase & {
  kind:'text',
  variableId:string
}>

export default ParseText;