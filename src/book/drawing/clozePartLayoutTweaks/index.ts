import { assert } from "decent-portal";

import Conclusion from "@/game/conclusions/types/Conclusion";
import ClozePartLayoutTweak from "@/book/types/ClozePartLayoutTweak";
import Point from "@/game/types/Point";
import { getLineHeightForFontSize } from '../pages';
import { IDENTITIES_PER_PAGE } from '@/book/identityLayoutConstants';

function _createEmptyTweaks(conclusion:Conclusion):Array<ClozePartLayoutTweak|null> {
  const tweaks = new Array<ClozePartLayoutTweak|null>();
  conclusion.parts.forEach(_p => tweaks.push(null));
  return tweaks;
}

const ROW_HEIGHT = 2 * getLineHeightForFontSize('m');
const TOP_MARGIN = 2 * getLineHeightForFontSize('s');

function _getRowYPercent(identityNo:number):number {
  return TOP_MARGIN + ((identityNo - 1) % IDENTITIES_PER_PAGE) * ROW_HEIGHT;
}

function _getColumnXOffset(identityNo:number):number {
  return Math.floor((identityNo - 1) / IDENTITIES_PER_PAGE) * 110;
}

function _getClozeBlankCursorPoint(identityNo:number):Point {
  const x = _getColumnXOffset(identityNo) + 20;
  const y = _getRowYPercent(identityNo) + 2.5;
  return [x,y];
}

function _getClozeImageCursorPoint(identityNo:number):Point {
  const x = _getColumnXOffset(identityNo);
  const y = _getRowYPercent(identityNo);
  return [x,y];
}

function _createIdentitiesTweaks(conclusion:Conclusion):Array<ClozePartLayoutTweak|null> {
  const tweaks = new Array<ClozePartLayoutTweak|null>();
  let identityCount = 0;

  for(let partI = 0; partI < conclusion.parts.length; ++partI) {
    const part = conclusion.parts[partI];
    switch(part.type) {
      case 'blank': {
        const cursorPoint = _getClozeBlankCursorPoint(identityCount);
        tweaks.push({ isHidden:false, cursorPoint });
      } break;

      case 'image':
        ++identityCount;
        const cursorPoint = _getClozeImageCursorPoint(identityCount);
        tweaks.push({ isHidden:false, cursorPoint });
      break;

      case 'separator':
        tweaks.push({ isHidden:true, cursorPoint:null });
      break;

      case 'text':
        tweaks.push({ isHidden:true, cursorPoint:null });
      break;

      default:
        tweaks.push(null);    
      break;
    }
  }
  assert(tweaks.length === conclusion.parts.length);
  return tweaks;
}

export function createClozePartLayoutTweaksForConclusion(conclusion:Conclusion):Array<ClozePartLayoutTweak|null> {
  switch(conclusion.id) {
    case 'identities': return _createIdentitiesTweaks(conclusion);
    default: return _createEmptyTweaks(conclusion);
  }
}