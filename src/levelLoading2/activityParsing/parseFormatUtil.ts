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
