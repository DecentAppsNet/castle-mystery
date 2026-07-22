import type ParseStepBase from "./ParseStepBase";

type ParseIdentifier = Readonly<ParseStepBase & {
  kind:'identifier',
  variableId:string,
  identifierKind:string
}>

export default ParseIdentifier;