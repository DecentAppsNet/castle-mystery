/* This file validates interchangeable blank groups and shares category answer sets within each conclusion.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from '@/game/conclusions/types/Conclusion';
import AnswerSet from '@/game/conclusions/types/AnswerSet';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { normalizeCategoryPhrase } from '@/game/conclusions/conclusionUtil';
import { ErrorCollector } from '../errorCollection';

export function validateBlankGroupsAndShareAnswerSets(conclusions:readonly Conclusion[], errors:ErrorCollector):void {
  for (const conclusion of conclusions) {
    // Keep ownership local and compare distinct normalized alternatives, not option inventories.
    const sets = new Map<string, AnswerSet>();
    const groups:{ answers:Set<string>, positions:number[] }[] = [];
    let position = 0;
    conclusion.parts = conclusion.parts.map(clozePart => {
      if (clozePart.type !== 'blank') return clozePart;
      const part = clozePart as ClozeBlank;
      position++;
      const answers = new Set(part.correctAnswerIndexes.map(index => normalizeCategoryPhrase(part.answerSet.answers[index])));
      const identical = groups.find(group => group.answers.size === answers.size && [...answers].every(answer => group.answers.has(answer)));

      // Partial intersections cannot be solved by the supported interchangeable-group rule.
      for (const group of groups) {
        const overlap = [...answers].filter(answer => group.answers.has(answer));
        if (group !== identical && overlap.length) {
          errors.addAt(`Conclusion "${conclusion.title}", blanks ${group.positions[0]} and ${position} partially overlap on "${overlap.join(' | ')}". ` +
            'Use disjoint or identical alternative sets.', ['conclusions', conclusion.title], '* conclusion=');
        }
      }
      const group = identical ?? { answers, positions:[] };
      if (!identical) groups.push(group);
      group.positions.push(position);
      if (group.positions.length > answers.size) {
        errors.addAt(`Conclusion "${conclusion.title}", blanks ${group.positions.join(', ')} require more distinct answers than ` +
          `"${[...answers].join(' | ')}" provides. Remove repeated blanks or supply enough identical alternatives.`,
          ['conclusions', conclusion.title], '* conclusion=');
      }

      // Replace only immutable metadata references; indexes and mutable selections stay independent.
      const categoryId = part.answerSet.sourceCategoryId;
      const answerSet = sets.get(categoryId) ?? part.answerSet;
      sets.set(categoryId, answerSet);
      return { ...part, answerSet };
    });
  }
}