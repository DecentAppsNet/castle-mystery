import type ParseKind from "./ParseKind";

/** Fields shared by every parse-step variant. */
type ParseStepBase = {
  kind:ParseKind,
  isOptional:boolean,
}

export default ParseStepBase;