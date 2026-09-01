import ParseStep from "./ParseStep";

/** Defines one activity verb and the parse-step tree for its syntax. */
type ParseFormat = {
  activityVerb:string,
  rootParseStep:ParseStep,
}

export default ParseFormat;