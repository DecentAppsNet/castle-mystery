import ParseFormat from "./ParseFormat";

export type AllowedValuesByIdentifierId = {[identifierId:string] : string[]};
export type ParseFormatsByVerb = {[verb:string] : ParseFormat};

type ActivityParsingRules = Readonly<{
  parseFormatsByVerb:ParseFormatsByVerb,
  allowedValuesByIdentifierId:AllowedValuesByIdentifierId
}>

export default ActivityParsingRules;