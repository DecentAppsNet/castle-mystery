import type ParseStepBase from "./ParseStepBase";

type ParseLiteral = Readonly<ParseStepBase & {
  kind:'literal',
  variableId:string|null,
  text:string
}>

export default ParseLiteral;