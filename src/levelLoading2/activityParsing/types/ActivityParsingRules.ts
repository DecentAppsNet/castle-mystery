import ParseFormat from "./ParseFormat";

export type AllowedValuesByIdentifierId = {[identifierId:string] : string[]};

type ActivityParsingRules = {
  parseFormatsByVerb:{[verb:string] : ParseFormat},
  allowedValuesByIdentifierId:AllowedValuesByIdentifierId
}

export default ActivityParsingRules;