import ParseFormat from "./ParseFormat";

/** Maps identifier kinds to the authored values they may match. */
export type AllowedValuesByIdentifierId = {[identifierId:string] : string[]};
/** Maps activity verbs to their accepted syntax. */
export type ParseFormatsByVerb = {[verb:string] : ParseFormat};

/** Complete formats, identifiers, and reserved words used to parse activities. */
type ActivityParsingRules = Readonly<{
  parseFormatsByVerb:ParseFormatsByVerb,
  allowedValuesByIdentifierId:AllowedValuesByIdentifierId,
  reservedWords:Set<string>
}>

export default ActivityParsingRules;