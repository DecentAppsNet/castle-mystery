import { assertNonNullable } from "decent-portal";
import ActivityParsingRules, { AllowedValuesByIdentifierId, ParseFormatsByVerb } from "./types/ActivityParsingRules";
import {
  createAppearsParseFormat,
  createAtActivityParseFormat,
  createBecomesParseFormat,
  createDropsParseFormat,
  createEmitsParseFormat,
  createFacesParseFormat,
  createGivesParseFormat,
  createHideParseFormat,
  createInterruptsParseFormat,
  createKneelsParseFormat,
  createLaysParseFormat,
  createLocksParseFormat,
  createSaysParseFormat,
  createShowParseFormat,
  createSitsParseFormat,
  createStandsParseFormat,
  createTakesParseFormat,
  createUnlocksParseFormat,
  createWaitsParseFormat,
} from "./activityParseFormats";
import ParseFormat from "./types/ParseFormat";

function _countWords(text:string):number {
  return text.split(' ').length;
}

function _areValuesSortedByWordCount(values:string[]):boolean {
  let lastWordCount = Number.POSITIVE_INFINITY;
  for(let i = 0; i < values.length; ++i) {
    const wordCount = _countWords(values[i]);
    if (wordCount > lastWordCount) return false;
    lastWordCount = wordCount;
  }
  return true;
}

function _wordCountComparator(a: string, b: string): number {
  return _countWords(b) - _countWords(a) || a.localeCompare(b);
}

export function throwIfActivityParsingRulesAreInvalid(rules:ActivityParsingRules):void {
  if (Object.keys(rules.parseFormatsByVerb).length === 0) throw Error('No parse formats');
  
  const identifierIds = Object.keys(rules.allowedValuesByIdentifierId);
  identifierIds.forEach(identifierId => {
    const allowedValues = rules.allowedValuesByIdentifierId[identifierId];
    assertNonNullable(allowedValues);
    if (!_areValuesSortedByWordCount(allowedValues)) throw Error(`Allowed values for ${identifierId} aren't sorted with higher word counts earlier.`);
  });
}

export function createActivityParsingRules(characterIds:string[], roomIds:string[], itemIds:string[], 
    appearanceIds:string[], parseFormatOverride:ParseFormat|null = null):ActivityParsingRules {
  const av:AllowedValuesByIdentifierId = {};
  av['CharacterId'] = [...characterIds].sort(_wordCountComparator);
  av['RoomId'] = [...roomIds].sort(_wordCountComparator);
  av['AppearanceId'] = [...appearanceIds].sort(_wordCountComparator);
  av['ItemId'] = [...itemIds].sort(_wordCountComparator);

  const pf:ParseFormatsByVerb = {};
  if (parseFormatOverride) {
    pf[parseFormatOverride.activityVerb] = parseFormatOverride;
  } else {
    pf['@'] = createAtActivityParseFormat();
    pf['appears'] = createAppearsParseFormat();
    pf['becomes'] = createBecomesParseFormat();
    pf['drops'] = createDropsParseFormat();
    pf['emits'] = createEmitsParseFormat();
    pf['faces'] = createFacesParseFormat();
    pf['gives'] = createGivesParseFormat();
    pf['hide'] = createHideParseFormat();
    pf['interrupts'] = createInterruptsParseFormat();
    pf['kneels'] = createKneelsParseFormat();
    pf['lays'] = createLaysParseFormat();
    pf['locks'] = createLocksParseFormat();
    pf['says'] = createSaysParseFormat();
    pf['show'] = createShowParseFormat();
    pf['sits'] = createSitsParseFormat();
    pf['stands'] = createStandsParseFormat();
    pf['takes'] = createTakesParseFormat();
    pf['unlocks'] = createUnlocksParseFormat();
    pf['waits'] = createWaitsParseFormat();
  }

  return {allowedValuesByIdentifierId:av, parseFormatsByVerb:pf};
}