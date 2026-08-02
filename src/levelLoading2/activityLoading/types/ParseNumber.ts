import type ParseStepBase from "./ParseStepBase";

type ParseNumber = Readonly<ParseStepBase & {
  kind:'number',
  variableId:string
}>

export default ParseNumber;