import type ParseStepBase from "./ParseStepBase";

/** A parse step matching fixed text, optionally capturing the match. */
type ParseLiteral = Readonly<ParseStepBase & {
  kind:'literal',
  variableId:string|null,
  text:string
}>

export default ParseLiteral;