/* This file exposes shared conclusion answer rules.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export { createAnswerSet } from './answerSetUtil';
export { countConclusionMistakes, isConclusionMissingAnswers, normalizeCategoryPhrase } from './conclusionUtil';