import { assert, assertNonNullable, botch } from "decent-portal";
import ActivityParsingRules, { AllowedValuesByIdentifierId, ParseFormatsByVerb } from "./types/ActivityParsingRules";
import { createAtActivityParseFormat } from "./activityHandlers/atHandler";
import { createAppearsParseFormat } from "./activityHandlers/appearsHandler";
import { createBecomesParseFormat } from "./activityHandlers/becomesHandler";
import { createDropsParseFormat } from './activityHandlers/dropsHandler';
import { createEmitsParseFormat } from "./activityHandlers/emitsHandler";
import { createFacesParseFormat } from "./activityHandlers/facesHandler";
import { createGivesParseFormat } from "./activityHandlers/givesHandler";
import { createHideParseFormat } from "./activityHandlers/hideHandler";
import { createInterruptsParseFormat } from "./activityHandlers/interruptsHandler";
import { createKneelsParseFormat } from "./activityHandlers/kneelsHandler";
import { createLaysParseFormat } from "./activityHandlers/laysHandler";
import { createLocksParseFormat } from "./activityHandlers/locksHandler";
import { createSaysParseFormat } from "./activityHandlers/saysHandler";
import { createShowParseFormat } from "./activityHandlers/showHandler";
import { createSitsParseFormat } from "./activityHandlers/sitsHandler";
import { createStandsParseFormat } from "./activityHandlers/standsHandler";
import { createTakesParseFormat } from './activityHandlers/takesHandler';
import { createUnlocksParseFormat } from "./activityHandlers/unlocksHandler";
import { createWaitsParseFormat } from "./activityHandlers/waitsHandler";
import ParseFormat from "./types/ParseFormat";
import ParseStep from "./types/ParseStep";

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

function _normalizeKeyword(text:string) { return text.trim().toLowerCase(); }

function _findReservedWordsInParseStepRecursively(step:ParseStep, reservedWords:Set<string>) {
  switch(step.kind) {
    case 'identifier': return;
    case 'literal': {
      const keyword = _normalizeKeyword(step.text);
      reservedWords.add(keyword);
      return;
    }
    case 'number': return;
    case 'text': return;
    case 'options': case 'sequence': {
      step.children.forEach(child => _findReservedWordsInParseStepRecursively(child, reservedWords));
      return;
    }
    
    default:
      botch(`unhandled step.kind`);
  }
}

function _findReservedWordsInParseFormats(pf:ParseFormatsByVerb):Set<string> {
  const reservedWords:Set<string> = new Set<string>();
  Object.keys(pf).forEach(verb => {
    const parseFormat = pf[verb];
    assertNonNullable(parseFormat);
    assert(parseFormat.activityVerb === verb);
    reservedWords.add(_normalizeKeyword(verb));
    _findReservedWordsInParseStepRecursively(parseFormat.rootParseStep, reservedWords);
  });
  return reservedWords;
}

function _sortByWordCountDescending(elements:string[]):string[] {
  if (elements.length < 2) return elements;
  return [...elements].sort(_wordCountComparator);
}

export function createActivityParsingRules(characterIds:string[], roomIds:string[], itemIds:string[], 
    appearanceIds:string[], parseFormatOverride:ParseFormat|null = null):ActivityParsingRules {
  const av:AllowedValuesByIdentifierId = {};
  av['CharacterId'] = _sortByWordCountDescending(characterIds);
  av['RoomId'] = _sortByWordCountDescending(roomIds);
  av['AppearanceId'] = _sortByWordCountDescending(appearanceIds);
  av['ItemId'] = _sortByWordCountDescending(itemIds);

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

  // I could check here for IDs that are using reserved words, but to keep a separation of concerns,
  // let other code handle that. This module will just populate reserved words.
  const reservedWords = _findReservedWordsInParseFormats(pf);

  return {allowedValuesByIdentifierId:av, parseFormatsByVerb:pf, reservedWords};
}