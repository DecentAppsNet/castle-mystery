import { assert, assertNonNullable, botch } from "decent-portal";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "./types/ActivityParsingRules";
import ParseFormat from "./types/ParseFormat";
import ActivityParts from "../types/ActivityParts";
import ParseStep from "./types/ParseStep";
import ParseSequence from "./types/ParseSequence";
import ParseOptions from "./types/ParseOptions";
import ParseNumber from "./types/ParseNumber";
import ParseText from "./types/ParseText";
import ParseIdentifier from "./types/ParseIdentifier";
import ParseLiteral from "./types/ParseLiteral";

function _isPositionInsideQuotes(text:string, position:number):boolean {
  let seekPos = 0;
  let insideQuotes = false;
  while(seekPos < text.length) {
    const nextQuotePos = text.indexOf('"', seekPos);
    if (nextQuotePos === -1 || nextQuotePos > position) return insideQuotes;
    insideQuotes = !insideQuotes;
    seekPos = nextQuotePos + 1;
  }
  return insideQuotes;
}

const SYMBOL_CHARS:string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890'
function _isSymbolChar(c:string|null):boolean {
  return c !== null && SYMBOL_CHARS.includes(c);
}

function _addPartValue(parts:ActivityParts, variableId:string, value:string|number) {
  assert(parts[variableId] === undefined, 'A parse format should never allow the same variable ID to be used twice.');
  parts[variableId] = value;
}

/* Use a subset of parsing logic to find a verb in the activity line.
 * The activityLine may be invalid, and this function is not responsible for validating it.
 * It will simply find the first match of a specified verb, assuming the activity line was well-formed, even if it isn't.
 */
function _hasVerbInActivityLine(verb:string, activityText:string):boolean {
  let seekPos = 0;
  while(seekPos < activityText.length) {
    const candidatePos = activityText.indexOf(verb, seekPos);
    if (candidatePos === -1) return false;
    seekPos = candidatePos + verb.length;

    // Check that verb is delimited on both sides.
    const prevChar = activityText[candidatePos-1] ?? null;
    const nextChar = activityText[candidatePos+verb.length] ?? null;
    if (_isSymbolChar(prevChar) || _isSymbolChar(nextChar)) continue;

    // If the verb candidate is inside quotes, then this can't be the verb. E.g. `Bob says, "It becomes something better."` should not match "becomes".
    if (_isPositionInsideQuotes(activityText, candidatePos)) continue;

    return true; // Verb was matched.
  }
  return false; // Activity line didn't contain the verb.
}

const ALLOWED_PUNCTUATION_REGEX = /[.!?,-]/g;
function _removeAllowedPunctuationOutsideOfQuotes(activityText:string):string {
  let filteredText = '';
  let seekPos = 0;
  let foundFilteredPunctuation = false;

  for (const match of activityText.matchAll(ALLOWED_PUNCTUATION_REGEX)) {
    const punctuationPos = match.index;
    assertNonNullable(punctuationPos, 'matchAll() should populate match.index.');
    if (_isPositionInsideQuotes(activityText, punctuationPos)) continue;

    filteredText += activityText.substring(seekPos, punctuationPos);
    seekPos = punctuationPos + 1;
    foundFilteredPunctuation = true;
  }

  if (!foundFilteredPunctuation) return activityText;
  filteredText += activityText.substring(seekPos);
  return filteredText;
}

// Purposefully, this normalizes whitespace inside and outside of quotes.
const WHITESPACE_REGEX = /\s+/g;
function _normalizeWhiteSpace(activityText:string):string {
  activityText = activityText.trim();
  return activityText.replaceAll(WHITESPACE_REGEX, ' ');
}

function _normalizeActivityText(activityText:string):string {
  activityText = _removeAllowedPunctuationOutsideOfQuotes(activityText);
  activityText = _normalizeWhiteSpace(activityText);
  return activityText;
}

function _isNormalizedActivityText(activityText:string):boolean {
  return _normalizeActivityText(activityText) === activityText;
}


/** Parses a normalized activity text to individual string tokens based on single space delimeters, where each space character is
 *  outside of quotes. 
 */
function _parseActivityTextToTokens(activityText:string):string[] {
  assert(_isNormalizedActivityText(activityText));
  if (!activityText) return [];
  const tokens:string[] = [];
  let tokenStartPos = 0;
  for (let pos = 0; pos < activityText.length; ++pos) {
    if (activityText[pos] !== ' ') continue;
    if (_isPositionInsideQuotes(activityText, pos)) continue;
    tokens.push(activityText.substring(tokenStartPos, pos));
    tokenStartPos = pos + 1;
  }
  tokens.push(activityText.substring(tokenStartPos));
  return tokens;
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseSequenceRecursively(tokens:string[], fromTokenI:number, step:ParseSequence, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|number {
  let seekTokenI = fromTokenI;
  for(let childI = 0; childI < step.children.length; ++childI) {
    if (seekTokenI >= tokens.length) return `Itinerary didn't have enough text to satisfy syntax requirements.`; // Vague message - possibly we add more description into the ParseStep format to use.
    const childStep:ParseStep = step.children[childI];
    const childParseResult = _tryParseStepRecursively(tokens, childStep, parts, allowedValuesByIdentifierId, seekTokenI);
    if (typeof childParseResult === 'number') { seekTokenI = childParseResult; continue; } // Successful match against one child step, which could advance seekPos 1 or more.
    // Failed match against a child step.
    if (!childStep.isOptional) return childParseResult; // If not optional, then the overall match against the sequence failed.

    // An optional child step wasn't parsed successfully. Not fatal - just try the same token against the next parse step.
  }
  return seekTokenI; // A successful match against the sequence.
}

function _getStepValue(step:ParseStep):string|number {
  switch(step.kind) {
    case 'identifier': return (step as ParseIdentifier).variableId; 
    case 'literal': return (step as ParseLiteral).text;
    case 'number': return (step as ParseNumber).variableId;
    case 'options': return (step as ParseOptions).variableId ?? step.kind;
    case 'sequence': return (step as ParseSequence).kind;
    case 'text': return (step as ParseText).variableId;
    default: botch(`No handling for ${(step as { kind?: unknown }).kind}`);
  }
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseOptionsRecursively(tokens:string[], fromTokenI:number, step:ParseOptions, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|number {
  if (fromTokenI >= tokens.length) return `Itinerary didn't have enough text to satisfy syntax requirements.`; // Vague message - possibly we add more description into the ParseStep format to use.
  for(let childI = 0; childI < step.children.length; ++childI) {
    const seekTokenI = fromTokenI;
    const childStep:ParseStep = step.children[childI];
    const childParseResult = _tryParseStepRecursively(tokens, childStep, parts, allowedValuesByIdentifierId, seekTokenI);
    if (typeof childParseResult === 'number') { // Matched.
      if (step.variableId) { // Set parts value for the option to value of matched option step.
        const value = _getStepValue(childStep);
        _addPartValue(parts, step.variableId, value);
      }
      return childParseResult;
    }
  }
  return `Was unable to match options.`; // Vague message - consider how to make it better.
}

function _tryParseNumber(token:string, step:ParseNumber, parts:ActivityParts):string|null {
  const value:number = Number.parseFloat(token);
  if (isNaN(value)) return `Could not parse a number for ${step.variableId}.`; // TODO bad error message
  _addPartValue(parts, step.variableId, value);
  return null;
}

function _tryParseText(token:string, step:ParseText, parts:ActivityParts):string|null {
  if (token.length < 2 || !token.startsWith('"') || !token.endsWith('"')) return 'Not a valid text token'; // TODO bad message
  const value = token.substring(1, token.length - 1);
  _addPartValue(parts, step.variableId, value);
  return null;
}

function _tryParseIdentifier(token:string, step:ParseIdentifier, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|null {
  const allowedValues = allowedValuesByIdentifierId[step.identifierKind];
  assertNonNullable(allowedValues, 'allowed values for an indentifier kind should be provided for all identifier parse steps');
  if (!allowedValues.includes(token)) return `token did not match an allowed value`; // TODO Bad error message
  _addPartValue(parts, step.variableId, token);
  // TODO - need to handle items, characters, and rooms with multiple words (tokens)
  // Replace `if (!allowedValues.includes(token))` line with:
  // for each allowed value in allowedValues
  //   count number of words (N) in it
  //   compare N tokens for a match
  // The function signature needs to change pass tokens, tokenI. Return value for success case is index of next token.
  // But solve your bad message problem first, because that will also change the function signature.
  return null;
}

function _tryParseLiteral(token:string, step:ParseLiteral, parts:ActivityParts):string|null {
  if (step.text !== token) return `token doesn't match literal`; // TODO bad message
  if (step.variableId) _addPartValue(parts, step.variableId, token);
  return null;
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseStepRecursively(tokens:string[], step:ParseStep, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId, fromTokenI = 0):string|number {
  switch(step.kind) {
    case 'identifier': return _tryParseIdentifier(tokens[fromTokenI], step, parts, allowedValuesByIdentifierId) ?? fromTokenI + 1;
    case 'literal': return _tryParseLiteral(tokens[fromTokenI], step, parts) ?? fromTokenI + 1;
    case 'number': return _tryParseNumber(tokens[fromTokenI], step, parts) ?? fromTokenI + 1;
    case 'options': return _tryParseOptionsRecursively(tokens, fromTokenI, step, parts, allowedValuesByIdentifierId);
    case 'sequence': return _tryParseSequenceRecursively(tokens, fromTokenI, step, parts, allowedValuesByIdentifierId);
    case 'text': return _tryParseText(tokens[fromTokenI], step, parts) ?? fromTokenI + 1;
    default: botch(`No handling for ${(step as { kind?: unknown }).kind}`);
  }
}

export function findVerbInActivityText(activityText:string, rules:ActivityParsingRules):string|null {
  const verbs = Object.keys(rules.parseFormatsByVerb);
  return verbs.find(v => _hasVerbInActivityLine(v, activityText)) ?? null;
}

export function splitActivityLineToTimestampAndActivityText(activityLine:string):{timestampText:string, activityText:string}|null {
  activityLine = activityLine.trim();
  const firstSpacePos = activityLine.indexOf(' ');
  if (firstSpacePos === -1) return null;
  const timestampText = activityLine.substring(0, firstSpacePos).trim();
  const activityText = _normalizeActivityText(activityLine.substring(firstSpacePos+1).trim());
  return (timestampText && activityText) ? { timestampText, activityText } : null;
}

export function tryParseActivityTextAgainstFormat(activityText:string, parseFormat:ParseFormat, rules:ActivityParsingRules):ActivityParts|string {
  assert(_hasVerbInActivityLine(parseFormat.activityVerb, activityText), `parseFormat verb not matching activity text.`);

  const tokens = _parseActivityTextToTokens(activityText);
  const parts:ActivityParts = {};
  const errorText = _tryParseStepRecursively(tokens, parseFormat.rootParseStep, parts, rules.allowedValuesByIdentifierId);
  return typeof errorText === 'string' ? errorText : parts;
}