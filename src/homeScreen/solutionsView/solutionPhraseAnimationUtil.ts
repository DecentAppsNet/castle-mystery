import Solution from '@/game/solutions/types/Solution';

export const SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS = 1050;
export const SOLUTION_PHRASE_ANIMATION_REVEAL_MSECS = 3000;

export type SolutionPhraseAnimationQueueItem = {
  id:string,
  phrase:string,
  unlockedSolutionIds:string[],
  durationMsecs:number
}

export function createSolutionPhraseAnimationQueueItems(previousSolutions:Solution[], nextSolutions:Solution[]):SolutionPhraseAnimationQueueItem[] {
  const nextSolutionById = new Map(nextSolutions.map(solution => [solution.id, solution]));
  const removedPhrasesBySolutionId = new Map<string, string[]>();
  const orderedPhrases:string[] = [];

  previousSolutions.forEach(previousSolution => {
    const nextSolution = nextSolutionById.get(previousSolution.id) || previousSolution;
    const nextRemainingPhrases = new Set(nextSolution.lockedRemainingPhrases);
    const removedPhrases = previousSolution.lockedRemainingPhrases.filter(phrase => !nextRemainingPhrases.has(phrase));
    if (!removedPhrases.length) return;
    removedPhrasesBySolutionId.set(previousSolution.id, removedPhrases);
    removedPhrases.forEach(phrase => {
      if (orderedPhrases.includes(phrase)) return;
      orderedPhrases.push(phrase);
    });
  });

  const currentCountsBySolutionId = new Map(previousSolutions.map(solution => [solution.id, solution.lockedRemainingPhrases.length]));

  return orderedPhrases.map((phrase, phraseIndex) => {
    const unlockedSolutionIds:string[] = [];

    previousSolutions.forEach(previousSolution => {
      const removedPhrases = removedPhrasesBySolutionId.get(previousSolution.id) || [];
      if (!removedPhrases.includes(phrase)) return;
      const currentCount = currentCountsBySolutionId.get(previousSolution.id) || 0;
      const nextCount = Math.max(0, currentCount - 1);
      currentCountsBySolutionId.set(previousSolution.id, nextCount);
      const nextSolution = nextSolutionById.get(previousSolution.id) || previousSolution;
      if (!nextSolution.isLocked && nextCount === 0) unlockedSolutionIds.push(previousSolution.id);
    });

    return {
      id:`${phraseIndex}:${phrase}`,
      phrase,
      unlockedSolutionIds,
      durationMsecs:unlockedSolutionIds.length > 0
        ? SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS + SOLUTION_PHRASE_ANIMATION_REVEAL_MSECS
        : SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS
    };
  });
}