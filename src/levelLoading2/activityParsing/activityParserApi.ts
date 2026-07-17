/* This module provides APIs for activity parsing to support an encapsulated set of modules inside of this folder. Code from outside this
  folder should generally only call functions from this module.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Activity from "../types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import ParseFormat from "./types/ParseFormat";
import ParseIdentifier from "./types/ParseIdentifier";
import ParseLiteral from "./types/ParseLiteral";
import ParseText from "./types/ParseText";
import ParseNumber from "./types/ParseNumber";
import ParseOptions from "./types/ParseOptions";
import ParseStep from "./types/ParseStep";
import ParseSequence from "./types/ParseSequence";
import { findVerbText, throwIfParseStepsInvalid } from "./parseFormatUtil";
import { assertNonNullable } from "decent-portal";
import { findVerbInActivityText, splitActivityLineToTimestampAndActivityText, tryParseActivityTextAgainstFormat } from "./parseUtil";
import { isRelativeTimestamp, tryParseAbsoluteTimestamp } from "./timestampUtil";

export function tryParseActivity(activityLine:string, rules:ActivityParsingRules):Activity|string {
  const splitResult = splitActivityLineToTimestampAndActivityText(activityLine); // This also covers case of an empty string being passed.
  if (!splitResult) return 'Itinerary line did not have timestamp followed by activity text.';
  const { timestampText, activityText } = splitResult;
  
  let startTime = null;
  if (!isRelativeTimestamp(timestampText)) {
    startTime = tryParseAbsoluteTimestamp(timestampText);
    if (!startTime) return `Itinerary line started with "${timestampText}" which does not follow expected timestamp format.`;
  }

  const verb = findVerbInActivityText(activityText, rules);
  if (!verb) return `Itinerary line didn't include a known verb.`;

  const parseFormat = rules.parseFormatsByVerb[verb];
  assertNonNullable(parseFormat, `Earlier successful call to findVerbInActivityText() should guarantee a parse format for the verb exists.`);
  const parseResult = tryParseActivityTextAgainstFormat(activityText, parseFormat, rules);
  if (typeof parseResult === 'string') return parseResult;

  const activity:Activity = {
    verb,
    startTime,
    duration:null,
    parts:parseResult
  }
  return activity;
}

export function createParseFormat(rootParseStep:ParseStep):ParseFormat {
  throwIfParseStepsInvalid(rootParseStep);
  const activityVerb = findVerbText(rootParseStep);
  assertNonNullable(activityVerb, 'throwIfParseStepsInvalid() should have thrown an exception if verb was missing.');
  return { activityVerb, rootParseStep };
}

//
// Helpers for creating parse steps that can be added to a rootParseStep hiearachy.
//
// Example of usage:
// const characterId = makeIdentifier('characterId', 'CharacterId', true);
// const dies = makeVerb('dies');
// const rootParseStep = makeSequence(characterId, dies);
//

export function makeOptions(options:ParseStep[], isOptional = false):ParseOptions { 
  return {kind:'options', variableId:null, children:options, isOptional}; 
}

export function makeVariableOptions(variableId:string, options:ParseStep[], isOptional = false):ParseOptions { 
  return {kind:'options', variableId, children:options, isOptional}; 
}

export function makeSequence(steps:ParseStep[], isOptional = false):ParseSequence { 
  return {kind:'sequence', children:steps, isOptional}; 
}

export function makeVerb(text:string):ParseLiteral { 
  return {kind:'literal', variableId:'verb', text, isOptional:false}; 
}

export function makeLiteral(text:string, isOptional = false):ParseLiteral { 
  return {kind:'literal', text, variableId:null, isOptional} 
}

export function makeLiteralOptions(texts:string[], isOptional = false):ParseOptions { 
  const children:ParseStep[] = texts.map((t) => makeLiteral(t,false));
  return {kind:'options', variableId:null, children, isOptional}; 
}

export function makeNumber(variableId:string, isOptional = false):ParseNumber { 
  return{kind:'number', variableId, isOptional}; 
}

export function makeText(variableId:string = 'text', isOptional = false):ParseText { 
  return {kind:'text', variableId, isOptional} 
}

export function makeVariableLiteral(variableId:string, text:string, isOptional = false):ParseLiteral { 
  return {kind:'literal', text, variableId, isOptional} 
}

export function makeVariableLiteralOptions(variableId:string, texts:string[], isOptional = false):ParseOptions { 
  return makeVariableOptions(variableId, texts.map(t => makeLiteral(t, false)), isOptional);
}

export function makeIdentifier(variableId:string, identifierKind:string, isOptional = false):ParseIdentifier { 
  return  {kind:'identifier', variableId, identifierKind, isOptional}; 
}
