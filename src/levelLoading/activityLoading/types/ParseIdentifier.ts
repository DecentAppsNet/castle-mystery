import type ParseStepBase from "./ParseStepBase";

/** A parse step that captures one allowed identifier value of a specified kind. */
type ParseIdentifier = Readonly<ParseStepBase & {
  kind:'identifier',
  variableId:string,
  identifierKind:string
}>

export default ParseIdentifier;