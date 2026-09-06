/* This file creates and validates the formats, identifiers, and reserved words used to parse activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";
import ActivityParsingRules, { AllowedValuesByIdentifierId, ParseFormatsByVerb } from "./types/ActivityParsingRules";
import { createAtActivityParseFormat } from "./activitySchedulers/atScheduler";
import { createAppearsParseFormat } from "./activitySchedulers/appearsScheduler";
import { createBecomesParseFormat } from "./activitySchedulers/becomesScheduler";
import { createDropsParseFormat } from './activitySchedulers/dropsScheduler';
import { createEmitsParseFormat } from "./activitySchedulers/emitsScheduler";
import { createFacesParseFormat } from "./activitySchedulers/facesScheduler";
import { createGivesParseFormat } from "./activitySchedulers/givesScheduler";
import { createHideParseFormat } from "./activitySchedulers/hideScheduler";
import { createInterruptsParseFormat } from "./activitySchedulers/interruptsScheduler";
import { createKneelsParseFormat } from "./activitySchedulers/kneelsScheduler";
import { createLaysParseFormat } from "./activitySchedulers/laysScheduler";
import { createLocksParseFormat } from "./activitySchedulers/locksScheduler";
import { createSaysParseFormat } from "./activitySchedulers/saysScheduler";
import { createShowParseFormat } from "./activitySchedulers/showScheduler";
import { createSitsParseFormat } from "./activitySchedulers/sitsScheduler";
import { createStandsParseFormat } from "./activitySchedulers/standsScheduler";
import { createTakesParseFormat } from './activitySchedulers/takesScheduler';
import { createThinksParseFormat } from "./activitySchedulers/thinksScheduler";
import { createUnlocksParseFormat } from "./activitySchedulers/unlocksScheduler";
import { createWaitsParseFormat } from "./activitySchedulers/waitsScheduler";
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

/** Throws when parsing rules lack formats or contain incorrectly ordered identifier values. */
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

/** Creates validated parsing rules for all supported activity verbs and identifiers. */
export function createActivityParsingRules(characterIds:string[], roomIds:string[], itemIds:string[], 
    skinNames:string[], parseFormatOverride:ParseFormat|null = null):ActivityParsingRules {
  const av:AllowedValuesByIdentifierId = {};
  av['CharacterId'] = _sortByWordCountDescending(characterIds);
  av['RoomId'] = _sortByWordCountDescending(roomIds);
  av['SkinName'] = _sortByWordCountDescending(skinNames);
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
    pf['thinks'] = createThinksParseFormat();
    pf['unlocks'] = createUnlocksParseFormat();
    pf['waits'] = createWaitsParseFormat();
  }

  // I could check here for IDs that are using reserved words, but to keep a separation of concerns,
  // let other code handle that. This module will just populate reserved words.
  const reservedWords = _findReservedWordsInParseFormats(pf);

  return {allowedValuesByIdentifierId:av, parseFormatsByVerb:pf, reservedWords};
}