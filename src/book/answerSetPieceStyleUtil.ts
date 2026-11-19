/* This file assigns conclusion-scoped piece styles by category, reserving built-in category styles.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import Conclusion from '@/game/conclusions/types/Conclusion';
import AnswerSetIdToPieceStyleNoMap from './types/AnswerSetIdToPieceStyleNoMap';

function _findReservedStyleNoForCategory(categoryId:string):number {
  switch(categoryId) {
    case 'characters': return 0;
    case 'items': return 1;
    case 'rooms': return 2;
    default: return -1;
  }
}

export function generateAnswerSetIdToPieceStyleNoMap(conclusion:Readonly<Conclusion>):AnswerSetIdToPieceStyleNoMap {
  // Keep the shared page lookup prototype-free and reserve styles 0–2 even when absent.
  const styles:{ [answerSetId:string]:number | undefined } = Object.create(null);
  const categoryStyles = new Map<string, number>();
  let nextCustomStyleNo = 3;

  // Assign each category once in blank appearance order, independently of answer membership.
  for (const part of conclusion.parts) {
    if (part.type !== 'blank') continue;
    const { answerSet } = part as ClozeBlank;
    const categoryId = answerSet.sourceCategoryId;
    let styleNo = categoryStyles.get(categoryId);
    if (styleNo === undefined) {
      const reservedStyleNo = _findReservedStyleNoForCategory(categoryId);
      styleNo = reservedStyleNo >= 0 ? reservedStyleNo : nextCustomStyleNo++;
      categoryStyles.set(categoryId, styleNo);
    }
    styles[answerSet.id] = styleNo;
  }
  return styles;
}
