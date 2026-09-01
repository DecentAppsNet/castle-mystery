/* This file creates, validates, and describes ParseFormat and ParseStep trees.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import ParseLiteral from "./types/ParseLiteral";
import ParseSequence from "./types/ParseSequence";
import ParseStep from "./types/ParseStep";
import ParseFormat from "./types/ParseFormat";
import ParseOptions from "./types/ParseOptions";
import ParseNumber from "./types/ParseNumber";
import ParseText from "./types/ParseText";
import ParseIdentifier from "./types/ParseIdentifier";

function _initialUpper(text:string):string {
  return text.substring(0,1).toUpperCase() + text.substring(1);
}

/** Creates a parse step that accepts one of several alternatives. */
export function makeOptions(options:ParseStep[], isOptional = false):ParseOptions { 
  return {kind:'options', variableId:null, children:options, isOptional}; 
}

/** Creates alternative parse steps whose selected value is captured. */
export function makeVariableOptions(variableId:string, options:ParseStep[], isOptional = false):ParseOptions { 
  return {kind:'options', variableId, children:options, isOptional}; 
}

/** Creates a parse step that matches child steps in order. */
export function makeSequence(steps:ParseStep[], isOptional = false):ParseSequence { 
  return {kind:'sequence', children:steps, isOptional}; 
}

/** Creates the literal step identifying an activity verb. */
export function makeVerb(text:string):ParseLiteral { 
  return {kind:'literal', variableId:'verb', text, isOptional:false}; 
}

/** Creates a fixed-text parse step. */
export function makeLiteral(text:string, isOptional = false):ParseLiteral { 
  return {kind:'literal', text, variableId:null, isOptional} 
}

/** Creates alternative fixed-text parse steps. */
export function makeLiteralOptions(texts:string[], isOptional = false):ParseOptions { 
  const children:ParseStep[] = texts.map((t) => makeLiteral(t,false));
  return {kind:'options', variableId:null, children, isOptional}; 
}

/** Creates alternative literals whose selected text is captured. */
export function makeVariableLiteralOptions(variableId:string, texts:string[], isOptional = false):ParseOptions {
  const children:ParseStep[] = texts.map((t) => makeLiteral(t,false));
  return {kind:'options', variableId, children, isOptional};
}

/** Creates a numeric parse step whose value is captured. */
export function makeNumber(variableId:string, isOptional = false):ParseNumber { 
  return{kind:'number', variableId, isOptional}; 
}

/** Creates a quoted-text parse step whose content is captured. */
export function makeText(variableId:string = 'text', isOptional = false):ParseText { 
  return {kind:'text', variableId, isOptional} 
}

/** Creates a fixed-text parse step whose matched text is captured. */
export function makeVariableLiteral(variableId:string, text:string, isOptional = false):ParseLiteral { 
  return {kind:'literal', text, variableId, isOptional} 
}

/** Creates a parse step matching an allowed identifier. */
export function makeIdentifier(variableId:string, identifierKind:string, isOptional = false):ParseIdentifier { 
  return  {kind:'identifier', variableId, identifierKind, isOptional}; 
}

// Errors in the parse format are always debug errors, since they are created with source code instead of user input. 
// For that reason, the checks here don't need to be exhaustive. This is a tool to see debug errors in the creation of 
// parse formats earlier in code for faster fixes. So, just add checks for things that are easy to check or seem to 
// come up in development.
/** Throws when a parse format has an invalid root or verb. */
export function throwIfParseFormatInvalid(parseFormat:ParseFormat):void {
  if (!parseFormat.activityVerb) throw Error('Missing activity verb.');
  throwIfParseStepsInvalid(parseFormat.rootParseStep);
}

/** Throws when a parse-step tree has an invalid root or lacks a verb. */
export function throwIfParseStepsInvalid(rootParseStep:ParseStep):void {
  if (rootParseStep.kind !== 'literal' && rootParseStep.kind !== 'sequence') throw Error('root can only be verb or a sequence');
  if (!findVerbText(rootParseStep)) throw Error('Could not find verb');
}

/** Finds the activity verb literal within a parse-step tree. */
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

function _describeParseStep(step:ParseStep, isRoot = false):string {
  let description = '';
  switch (step.kind) {
    case 'identifier':
      description = step.identifierKind;
      break;
    case 'literal':
      description = '`' + step.text + '`';
      break;
    case 'number':
      description = step.variableId ? _initialUpper(step.variableId) : 'Number';
      break;
    case 'options':
      const childDescriptions = step.children.map(child => _describeParseStep(child)).join('|');
      description = step.isOptional ? childDescriptions : `{${childDescriptions}}`; // Optional grouping chars ("[" + "]") can group inner text instead of "{" + "}".
      break;
    case 'sequence': {
      const childDescriptions = step.children.map(child => _describeParseStep(child)).join(' ');
      description = (isRoot || step.isOptional) ? childDescriptions : `{${childDescriptions}}`;
      break;
    }
    case 'text':
      description = step.variableId ? `"${_initialUpper(step.variableId)}"` : '"Text"';
      break;
    default:
      assert(false, `Unhandled ParseStep kind in _describeParseStep(): ${(step as { kind?: unknown }).kind}`);
  }

  return step.isOptional ? `[${description}]` : description;
}

// Returns display text explaining parse format syntax.
/** Describes a parse format as concise author-facing syntax. */
export function describeParseFormat(parseFormat:ParseFormat):string {
  throwIfParseFormatInvalid(parseFormat);
  return `Timestamp ${_describeParseStep(parseFormat.rootParseStep, true)}`;
}

/** Validates a parse-step tree and creates its verb-keyed parse format. */
export function createParseFormat(rootParseStep:ParseStep):ParseFormat {
  throwIfParseStepsInvalid(rootParseStep);
  const activityVerb = findVerbText(rootParseStep);
  assertNonNullable(activityVerb, 'throwIfParseStepsInvalid() should have thrown an exception if verb was missing.');
  return { activityVerb, rootParseStep };
}
