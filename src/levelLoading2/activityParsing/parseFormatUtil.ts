/* This module groups validation and debug-display helpers for ParseFormat and ParseStep trees.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import ParseLiteral from "./types/ParseLiteral";
import ParseSequence from "./types/ParseSequence";
import ParseStep from "./types/ParseStep";
import ParseFormat from "./types/ParseFormat";

// Errors in the parse format are always debug errors, since they are created with source code instead of user input. 
// For that reason, the checks here don't need to be exhaustive. This is a tool to see debug errors in the creation of 
// parse formats earlier in code for faster fixes. So, just add checks for things that are easy to check or seem to 
// come up in development.
export function throwIfParseFormatInvalid(parseFormat:ParseFormat):void {
  if (!parseFormat.activityVerb) throw Error('Missing activity verb.');
  throwIfParseStepsInvalid(parseFormat.rootParseStep);
}

export function throwIfParseStepsInvalid(rootParseStep:ParseStep):void {
  if (rootParseStep.kind !== 'literal' && rootParseStep.kind !== 'sequence') throw Error('root can only be verb or a sequence');
  if (!findVerbText(rootParseStep)) throw Error('Could not find verb');
}

export function findVerbText(rootParseStep:ParseStep):string|null {
  if (rootParseStep.kind === 'literal') { // Check for verb at root.
    const asLiteral = rootParseStep as ParseLiteral;
    if (asLiteral.variableId === 'verb') return asLiteral.text;
  } else if (rootParseStep.kind === 'sequence') { // Check for verb in root sequence.
    const children = (rootParseStep as ParseSequence).children;
    for(let childI = 0; childI < children.length; ++childI) {
      const child:ParseLiteral = children[childI] as ParseLiteral;
      if (child.kind !== 'literal') continue;
      if (child.variableId === 'verb') return child.text;
    }
  }
  return null;
}

/** Returns display text that describes expectations of the format. variableIds are internal use only.
 * 
 * Rules:
 * - Always prefix return string with "Timestamp " because all activity lines in an itinerary must have a timestamp.
 * - The remaining output is derived from hierarchical mapping of parseStep values from rootParseStep to output text.
 * - If a ParseStep has .isOptional=true its output should be enclosed with "[" and "]".
 * - If a ParseStep has .kind='sequence':
 *   - its output should be enclosed with "{" and "}"
 *   - the exception to the above rule is if `rootParseStep` is the sequence, in which case omit enclosing "{"+"}".
 *   - if the sequence is optional, the "["+"]" encloses "{"+"}".
 *   - each child ParseStep is processed recursively to general output text inside of the enclosing "{"+"}" for the sequence.
 *     The collected outputs of the childen will be delimited with " " inside the sequence.
 * - If a ParseStep has .kind='options':
 *   - its output should be enclosed with "{" and "}"
 *   - if the options are optional, the "["+"]" encloses "{"+"}".
 *   - each child ParseStep is processed recursively to general output text inside of the enclosing "{"+"}" for the sequence.
 *     The collected outputs of the childen will be delimited with "|" inside the sequence.
 * - If a ParseStep has .kind='idenfifier' its output is .identifierKind
 * - If a ParseStep has .kind='number' its output is `Number`
 * - If a ParseStep has .kind='text' its output is `"Text"`
 * - If a ParseStep has .kind='literal' its output is .text enclosed in quotes.
 * 
 * Examples: 
 *   Timestamp [CharacterId] "@" RoomId
 *   Timestamp [CharacterId] "takes" ItemId [{ {"in"|"into"} {"left hand"|"right hand"|"inventory"}} }]
 *   Timestamp [{ItemId|CharacterId}] "emits" "Text" ["loudly"]
 */
function _describeParseStep(step:ParseStep, isRoot = false):string {
  let description = '';
  switch (step.kind) {
    case 'identifier':
      description = step.identifierKind;
      break;
    case 'literal':
      description = `"${step.text}"`;
      break;
    case 'number':
      description = 'Number';
      break;
    case 'options':
      description = `{${step.children.map(child => _describeParseStep(child)).join('|')}}`;
      break;
    case 'sequence': {
      const childDescriptions = step.children.map(child => _describeParseStep(child)).join(' ');
      description = isRoot ? childDescriptions : `{${childDescriptions}}`;
      break;
    }
    case 'text':
      description = '"Text"';
      break;
    default:
      assert(false, `Unhandled ParseStep kind in _describeParseStep(): ${(step as { kind?: unknown }).kind}`);
  }

  return step.isOptional ? `[${description}]` : description;
}

export function describeParseFormat(parseFormat:ParseFormat):string {
  throwIfParseFormatInvalid(parseFormat);
  return `Timestamp ${_describeParseStep(parseFormat.rootParseStep, true)}`;
}
