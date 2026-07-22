import ParseFormat from "./ParseFormat";

export type AllowedValuesByIdentifierId = {[identifierId:string] : string[]};
export type ParseFormatsByVerb = {[verb:string] : ParseFormat};

type ActivityParsingRules = Readonly<{
  parseFormatsByVerb:ParseFormatsByVerb,
  allowedValuesByIdentifierId:AllowedValuesByIdentifierId,
  reservedWords:Set<string>
}>

export default ActivityParsingRules;