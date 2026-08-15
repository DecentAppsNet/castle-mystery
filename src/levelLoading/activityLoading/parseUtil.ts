/* This module groups activity-text normalization, tokenization, and recursive parse helpers for levelLoading2 activity parsing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";
import { ParsedActivity } from "./types/Activity";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "./types/ActivityParsingRules";
import ParseFormat from "./types/ParseFormat";
import ActivityParts from "./types/ActivityParts";
import ParseStep from "./types/ParseStep";
import ParseSequence from "./types/ParseSequence";
import ParseOptions from "./types/ParseOptions";
import ParseNumber from "./types/ParseNumber";
import ParseText from "./types/ParseText";
import ParseIdentifier from "./types/ParseIdentifier";
import ParseLiteral from "./types/ParseLiteral";
import { isRelativeTimestamp, tryParseAbsoluteTimestamp } from "./timestampUtil";
import { describeParseFormat } from "./parseFormatUtil";
import { throwIfActivityParsingRulesAreInvalid } from "./parsingRulesUtil";
import { isNormalizedId, normalizeId } from "@/game/idUtil";


const SYMBOL_CHARS:string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890'
function _isSymbolChar(c:string|null):boolean {
  return c !== null && SYMBOL_CHARS.includes(c);
}

function _isNumericChar(c:string|null|undefined):boolean {
  return typeof c === 'string' && c >= '0' && c <= '9';
}

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

function _isPositionAtDecimalPoint(text:string, position:number):boolean {
  return (text[position] === '.' && _isNumericChar(text[position-1]) && _isNumericChar(text[position+1]));
}

function _isPositionAtNegativeSign(text:string, position:number):boolean {
  return (text[position] === '-' && _isNumericChar(text[position+1]));
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

const ALLOWED_PUNCTUATION_REGEX = /[.!?,-]/g; // Allowed exception to regex-helper best practices for code simplicity.
function _removeAllowedPunctuation(activityText:string):string {
  let filteredText = '';
  let seekPos = 0;
  let foundFilteredPunctuation = false;

  for (const match of activityText.matchAll(ALLOWED_PUNCTUATION_REGEX)) {
    const punctuationPos = match.index;
    assertNonNullable(punctuationPos, 'matchAll() should populate match.index.');
    if (_isPositionInsideQuotes(activityText, punctuationPos) 
      || _isPositionAtDecimalPoint(activityText, punctuationPos) 
      || _isPositionAtNegativeSign(activityText, punctuationPos) 
    ) continue;

    filteredText += activityText.substring(seekPos, punctuationPos);
    seekPos = punctuationPos + 1;
    foundFilteredPunctuation = true;
  }

  if (!foundFilteredPunctuation) return activityText;
  filteredText += activityText.substring(seekPos);
  return filteredText;
}

// Purposefully, this normalizes whitespace inside and outside of quotes.
const WHITESPACE_REGEX = /\s+/g; // Allowed exception to regex-helper best practices for code simplicity.
function _normalizeWhiteSpace(activityText:string):string {
  activityText = activityText.trim();
  return activityText.replaceAll(WHITESPACE_REGEX, ' ');
}

function _normalizeActivityText(activityText:string):string {
  activityText = _removeAllowedPunctuation(activityText);
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

function _parseValueFromExpectedMessage(expectedMessage:string):string {
  assert(expectedMessage.startsWith('Expected '));
  const startPos = 'Expected '.length;
  const endPos = expectedMessage.indexOf(' after ');
  assert(endPos !== -1);
  return expectedMessage.substring(startPos, endPos);
}

function _concatExpectedMessage(expectedValue:string, lastToken:string):string {
  const message = `Expected ${expectedValue} after "${lastToken}".`
  assert(_parseValueFromExpectedMessage(message)===expectedValue, `Keep _parseValueFromExpectedMessage() coupled to the message generated by this function.`);
  return message;
}

function _concatExpectedIdentifierMessage(expectedValue:string, lastToken:string, thisToken:string):string {
  const message = `Expected ${expectedValue} after "${lastToken}" but "${thisToken}" did not match allowed values.`;
  assert(_parseValueFromExpectedMessage(message)===expectedValue, `Keep _concatExpectedIdentifierMessage() coupled to the message generated by this function.`);
  return message;
}

function _countRequiredSteps(steps:ParseStep[]):number {
  let count = steps.length;
  steps.forEach(s => { if (s.isOptional) --count });
  return count;
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseSequenceRecursively(tokens:string[], fromTokenI:number, step:ParseSequence, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|number {
  let seekTokenI = fromTokenI;
  let requiredStepCount = _countRequiredSteps(step.children);
  for(let childI = 0; childI < step.children.length; ++childI) {
    const lastToken = _getLastToken(tokens, seekTokenI);
    const remainingTokenCount = tokens.length - seekTokenI;
    if (remainingTokenCount < requiredStepCount) return _concatExpectedMessage(`at least ${remainingTokenCount} words`, lastToken);
    if (!remainingTokenCount) break;
    const childStep:ParseStep = step.children[childI];
    const childParseResult = _tryParseStepRecursively(tokens, childStep, parts, allowedValuesByIdentifierId, seekTokenI);
    if (typeof childParseResult === 'number') { // Successful match against one child step, which would advance seekPos 1 or more.
      assert(childParseResult > seekTokenI, `when parsing "${tokens[seekTokenI]}" return number of ${childParseResult} didn't advance past ${seekTokenI} current postion.`);
      seekTokenI = Math.max(childParseResult, seekTokenI+1); // Assertion above checks this, but in production builds, must avoid infinite loops even from debug errors.
      if (!childStep.isOptional) --requiredStepCount; 
      continue; 
    } 
    // Failed match against a child step.
    if (!childStep.isOptional) return childParseResult; // If not optional, then the overall match against the sequence failed.

    // An optional child step wasn't parsed successfully. Not fatal - just try the same token against the next parse step.
  }
  assert(requiredStepCount === 0, `Error in required count logic.`);
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

function _concatOrSequence(options:string[]):string {
  assert(options.length > 0);
  if (options.length === 1) return options[0];
  if (options.length === 2) return `${options[0]} or ${options[1]}`;
  let optionsText = '';
  for(let i = 0; i<options.length; ++i) {
    optionsText += options[i];
    if (i < options.length - 1) optionsText += ', ';
    if (i === options.length - 2) optionsText += 'or ';
  }
  return optionsText;
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseOptionsRecursively(tokens:string[], lastToken:string, fromTokenI:number, step:ParseOptions, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|number {
  const expectedValues:string[] = [];
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
    expectedValues.push(_parseValueFromExpectedMessage(childParseResult));
  }
  assert(expectedValues.length > 0, 'Do you have a parse format with no options specified?');
  return _concatExpectedMessage(_concatOrSequence(expectedValues), lastToken);
}

function _tryParseNumber(token:string, lastToken:string, step:ParseNumber, parts:ActivityParts):string|null {
  const value:number = Number.parseFloat(token);
  if (isNaN(value)) return _concatExpectedMessage('a number', lastToken);
  _addPartValue(parts, step.variableId, value);
  return null;
}

function _tryParseText(token:string, lastToken:string, step:ParseText, parts:ActivityParts):string|null {
  if (token.length < 2 || !token.startsWith('"') || !token.endsWith('"')) return _concatExpectedMessage('quote-enclosed text', lastToken);
  const value = token.substring(1, token.length - 1);
  _addPartValue(parts, step.variableId, value);
  return null;
}

function _getLastToken(tokens:string[], tokenI:number):string {
  assert(tokens.length > 0);
  return tokenI > 0 ? tokens[tokenI-1] : 'Timestamp';
}

function _countWords(text:string):number {
  const words = text.split(' ');
  return words.length;
}

function _tryParseIdentifier(tokens:string[], fromI:number, step:ParseIdentifier, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId):string|number {
  const allowedValues = allowedValuesByIdentifierId[step.identifierKind];
  assertNonNullable(allowedValues, 'allowed values for an indentifier kind should be provided for all identifier parse steps');

  for(let valueI = 0; valueI < allowedValues.length; ++valueI) {
    const value = allowedValues[valueI];
    assert(isNormalizedId(value), `"${value} is not a normalized ID.`);
    const wordCount = _countWords(value);
    let tokenCandidate = tokens[fromI];
    for(let wordI = 1; wordI < wordCount && fromI + wordI < tokens.length; ++wordI) {
      tokenCandidate += ` ${tokens[fromI + wordI]}`;
    }
    tokenCandidate = normalizeId(tokenCandidate);
    if (value === tokenCandidate) {
      _addPartValue(parts, step.variableId, tokenCandidate);
      return fromI + wordCount;
    }
  }

  const thisToken = tokens[fromI], lastToken = _getLastToken(tokens, fromI);
  return _concatExpectedIdentifierMessage(step.identifierKind, lastToken, thisToken);
}

function _tryParseLiteral(tokens:string[], fromTokenI:number, step:ParseLiteral, parts:ActivityParts):string|number {
  const wordCount = _countWords(step.text);
  let candidateText = tokens[fromTokenI];
  for(let wordI = 1; wordI < wordCount; ++wordI) {
    candidateText += ` ${tokens[fromTokenI+wordI]}`;
  }
  if (step.text !== candidateText) return _concatExpectedMessage(`"${step.text}"`, _getLastToken(tokens, fromTokenI));
  if (step.variableId) _addPartValue(parts, step.variableId, candidateText);
  return fromTokenI + wordCount;;
}

// Returns string if there is an error. Otherwise returns the token index following the last token used for parsing this step.
function _tryParseStepRecursively(tokens:string[], step:ParseStep, parts:ActivityParts, allowedValuesByIdentifierId:AllowedValuesByIdentifierId, fromTokenI = 0):string|number {
  const lastToken = _getLastToken(tokens, fromTokenI);
  switch(step.kind) {
    case 'identifier': return _tryParseIdentifier(tokens, fromTokenI, step, parts, allowedValuesByIdentifierId);
    case 'literal': return _tryParseLiteral(tokens, fromTokenI, step, parts);
    case 'number': return _tryParseNumber(tokens[fromTokenI], lastToken, step, parts) ?? fromTokenI + 1;
    case 'options': return _tryParseOptionsRecursively(tokens, lastToken, fromTokenI, step, parts, allowedValuesByIdentifierId);
    case 'sequence': return _tryParseSequenceRecursively(tokens, fromTokenI, step, parts, allowedValuesByIdentifierId);
    case 'text': return _tryParseText(tokens[fromTokenI], lastToken, step, parts) ?? fromTokenI + 1;
    default: botch(`No handling for ${(step as { kind?: unknown }).kind}`);
  }
}

function _findVerbInActivityText(activityText:string, rules:ActivityParsingRules):string|null {
  const verbs = Object.keys(rules.parseFormatsByVerb);
  return verbs.find(v => _hasVerbInActivityLine(v, activityText)) ?? null;
}

function _splitActivityLineToTimestampAndActivityText(activityLine:string):{timestampText:string, activityText:string}|null {
  activityLine = activityLine.trim();
  const firstSpacePos = activityLine.indexOf(' ');
  if (firstSpacePos === -1) return null;
  const timestampText = activityLine.substring(0, firstSpacePos).trim();
  const activityText = _normalizeActivityText(activityLine.substring(firstSpacePos+1).trim());
  return (timestampText && activityText) ? { timestampText, activityText } : null;
}

function _concatFinalErrorMessage(failReason:string, parseFormat:ParseFormat):string {
   return `${failReason} Expected format for "${parseFormat.activityVerb}": ${describeParseFormat(parseFormat)}`;
}

function _tryParseActivityTextAgainstFormat(activityText:string, parseFormat:ParseFormat, rules:ActivityParsingRules):ActivityParts|string {
  assert(_hasVerbInActivityLine(parseFormat.activityVerb, activityText), `parseFormat verb not matching activity text.`);

  const tokens = _parseActivityTextToTokens(activityText);
  const parts:ActivityParts = {};
  const result = _tryParseStepRecursively(tokens, parseFormat.rootParseStep, parts, rules.allowedValuesByIdentifierId);
  if (typeof result === 'string') return _concatFinalErrorMessage(result, parseFormat);
  if (result < tokens.length) return _concatFinalErrorMessage(`Did not expect more words after "${tokens[result-1]}".`, parseFormat);
  return parts;
}

function _getStartAndEndTimes(activityTime:number|null, verb:string):{startTime:number|null, endTime:number|null} {
  let startTime = null, endTime = null;
  if (doesActivityUseEndTimestamp(verb)) {
    endTime = activityTime;
  } else {
    startTime = activityTime;
  }
  return {startTime, endTime};
}

export function doesActivityUseEndTimestamp(verb:string) { return verb === '@'; }

export function tryParseActivity(activityLine:string, rules:ActivityParsingRules):ParsedActivity|string {
  throwIfActivityParsingRulesAreInvalid(rules);

  const splitResult = _splitActivityLineToTimestampAndActivityText(activityLine);
  if (!splitResult) return 'Itinerary line did not have timestamp followed by activity text.';
  const { timestampText, activityText } = splitResult;
  let activityTime = null;
  if (!isRelativeTimestamp(timestampText)) {
    activityTime = tryParseAbsoluteTimestamp(timestampText);
    if (activityTime === null) return `Itinerary line started with "${timestampText}" which does not follow expected timestamp format.`;
  }
  
  const verb = _findVerbInActivityText(activityText, rules);
  if (!verb) return `Itinerary line didn't include a known verb.`;

  const { startTime, endTime } = _getStartAndEndTimes(activityTime, verb);

  const parseFormat = rules.parseFormatsByVerb[verb];
  assertNonNullable(parseFormat, 'Earlier successful call to _findVerbInActivityText() should guarantee a parse format for the verb exists.');
  const parseResult = _tryParseActivityTextAgainstFormat(activityText, parseFormat, rules);
  if (typeof parseResult === 'string') return parseResult;

  const activity:ParsedActivity = {
    verb,
    startTime,
    endTime,
    parts:parseResult,
    nextActivity:null
  };
  return activity;
}