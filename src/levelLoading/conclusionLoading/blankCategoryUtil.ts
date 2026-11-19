/* This file resolves all correct alternatives in a blank to one effective category and reports authoring failures.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { normalizeCategoryPhrase } from './commonUtil';
import ClozeCategory from './types/ClozeCategory';

export function resolveBlankCategory(correctAnswers:readonly string[], categories:Record<string, ClozeCategory>,
    reportError:(message:string) => void):ClozeCategory|null {
  // Empty blanks have no category and must not become successful fallback-only answer sets.
  if (!correctAnswers.length) {
    reportError('The blank has no correct answers. Supply an answer from one effective category.');
    return null;
  }

  // Check every alternative, retaining independent diagnostics before rejecting the whole blank.
  let selected:ClozeCategory|null = null;
  let isValid = true;
  for (const answer of correctAnswers) {
    const matches = Object.values(categories).filter(category =>
      category.allowedValues.some(value => normalizeCategoryPhrase(value) === normalizeCategoryPhrase(answer)));
    if (matches.length !== 1) {
      reportError(`Answer "${answer}" must belong to exactly one effective category; found ${matches.length}. ` +
        'Add it to the intended category, or remove overlapping category entries.');
      isValid = false;
      continue;
    }
    const category = matches[0];
    if (selected && selected !== category) {
      reportError(`Answer "${answer}" belongs to "${category.authoredName}", but another alternative belongs to ` +
        `"${selected.authoredName}". All alternatives in a blank must use the same category.`);
      isValid = false;
    }
    selected = category;
  }
  return isValid ? selected : null;
}