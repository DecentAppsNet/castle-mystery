/* This file derives shared conclusion-scoped piece-style lookups from answer membership and provenance.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import AnswerSet from '@/game/conclusions/types/AnswerSet';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import Conclusion from '@/game/conclusions/types/Conclusion';
import AnswerSetIdToPieceStyleNoMap from './types/AnswerSetIdToPieceStyleNoMap';

function _findReservedStyleNoForAnswerSet(answerSet:AnswerSet):number {
  const categoryId = answerSet.sourceCategoryId;
  switch(categoryId) {
    case 'characters': return 0;
    case 'items': return 1;
    case 'rooms': return 2;
    default: return -1;
  }
}

export function generateAnswerSetIdToPieceStyleNoMap(conclusion:Readonly<Conclusion>):AnswerSetIdToPieceStyleNoMap {
  // Group exact membership without changing any blank's ordered options or indexes.
  const groups:{ membership:string, answerSets:AnswerSet[] }[] = [];
  for (const part of conclusion.parts) {
    if (part.type !== 'blank') continue;
    const { answerSet } = part as ClozeBlank;
    const membership = JSON.stringify([...new Set(answerSet.answers)].sort());
    let group = groups.find(candidate => candidate.membership === membership);
    if (!group) {
      group = { membership, answerSets:[] };
      groups.push(group);
    }
    group.answerSets.push(answerSet);
  }

  // Resolve aliases together so later provenance can supply a higher-priority reserved style.
  const styles:{ [answerSetId:string]:number | undefined } = Object.create(null);
  let nextCustomStyleNo = 3;
  for (const group of groups) {
    const reservedStyleNo = group.answerSets.length === 1 
      ? _findReservedStyleNoForAnswerSet(group.answerSets[0]) : -1;
    const styleNo = reservedStyleNo >= 0 ? reservedStyleNo : nextCustomStyleNo++;
    for (const answerSet of group.answerSets) styles[answerSet.id] = styleNo;
  }
  return styles;
}
