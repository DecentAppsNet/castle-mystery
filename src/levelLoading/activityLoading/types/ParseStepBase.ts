import type ParseKind from "./ParseKind";

type ParseStepBase = {
  kind:ParseKind,
  isOptional:boolean,
}

export default ParseStepBase;