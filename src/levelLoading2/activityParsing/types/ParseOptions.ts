import type ParseStep from "./ParseStep";
import type ParseStepBase from "./ParseStepBase";

type ParseOptions = Readonly<ParseStepBase & {
  kind:'options',
  variableId:string|null,
  children:ParseStep[]
}>

export default ParseOptions;