import { findWordLikeTextSegments } from '@/common/regExUtil';

import Solution, { duplicateSolution } from './types/Solution';

export function normalizeSolutionPhrase(text:string):string {
  return findWordLikeTextSegments(text)
    .map(segment => segment.enclosedText.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function _doesNormalizedTextContainPhrase(normalizedText:string, normalizedPhrase:string):boolean {
  return normalizedText === normalizedPhrase
    || normalizedText.startsWith(`${normalizedPhrase} `)
    || normalizedText.endsWith(` ${normalizedPhrase}`)
    || normalizedText.includes(` ${normalizedPhrase} `);
}

export function findNormalizedSolutionPhrasesInText(text:string, candidatePhrases:ReadonlyArray<string>):string[] {
  const normalizedText = normalizeSolutionPhrase(text);
  const matchingPhrases:string[] = [];

  candidatePhrases.forEach(candidatePhrase => {
    if (!candidatePhrase || !_doesNormalizedTextContainPhrase(normalizedText, candidatePhrase) || matchingPhrases.includes(candidatePhrase)) return;
    matchingPhrases.push(candidatePhrase);
  });

  return matchingPhrases;
}

function _haveSamePhrases(phrases1:string[], phrases2:string[]):boolean {
  return phrases1.length === phrases2.length && phrases1.every((phrase, index) => phrase === phrases2[index]);
}

export function syncSolutionsWithDiscoveredPhrases(solutions:Solution[], discoveredPhrases:ReadonlySet<string>):{ solutions:Solution[], didChange:boolean } {
  let didChange = false;

  const nextSolutions = solutions.map(solution => {
    const nextRemainingPhrases = solution.lockedRemainingPhrases.filter(phrase => !discoveredPhrases.has(phrase));
    const nextIsLocked = nextRemainingPhrases.length > 0;
    const isUnchanged = solution.isLocked === nextIsLocked && _haveSamePhrases(solution.lockedRemainingPhrases, nextRemainingPhrases);
    if (isUnchanged) return solution;

    didChange = true;
    const nextSolution = duplicateSolution(solution);
    nextSolution.isLocked = nextIsLocked;
    nextSolution.lockedRemainingPhrases = nextRemainingPhrases;
    return nextSolution;
  });

  return { solutions:nextSolutions, didChange };
}