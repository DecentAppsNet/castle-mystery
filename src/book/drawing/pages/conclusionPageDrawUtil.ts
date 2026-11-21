/* This file draws conclusion content, answer slots, instructions, and locked-conclusion overlays.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "@/book/types/BookPage";
import { assert, assertNonNullable, botch } from "decent-portal";
import PageWriter from "./PageWriter";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozeText from "@/game/conclusions/types/ClozeText";
import { drawObscuredPolygon } from "@/common/drawing/obscurePolygonDrawUtil";
import ClozeBlank from "@/game/conclusions/types/ClozeBlank";
import ClozeImage from "@/game/conclusions/types/ClozeImage";
import PieceSlotLayout from "../types/PieceSlotLayout";
import PieceSlotPresentation from "@/book/types/PieceSlotPresentation";
import { getConclusionPageInstructionText } from '@/book/bookClaimControlUtil';
import BookClaimGlint from '@/book/types/BookClaimGlint';
import ClozePart from "@/game/conclusions/types/ClozePart";

function _isClozeImageUrlResolved(part:ClozePart) {
  return typeof (part as ClozeImage).imageUrl === 'string'; // If it's an array, then there was no resolution of candidate URLs to a single URL performed.
}

type ConclusionPage = Extract<BookPage, { kind:'conclusion' }>;
export function drawConclusionPage(page:ConclusionPage, pw:PageWriter, pageNo:number, slotLayouts:PieceSlotLayout[]|null,
  presentations:readonly PieceSlotPresentation[], glints:readonly BookClaimGlint[], messageAlpha:number) {
  // Draw parts in file order, retaining the actual mutable blank identity.
  pw.setFontSize('m');
  for(let partI = 0; partI < page.conclusion.parts.length; ++partI) {
    const part = page.conclusion.parts[partI];
    switch(part.type) {
      case ClozePartType.blank:
        const blankPart = part as ClozeBlank;
        const playerGuess = blankPart.answerSet.answers[blankPart.playerAnswerIndex] ?? '';
        if (page.conclusion.isComplete) pw.addText(playerGuess, 'black', true);
        else {
          const pieceStyleNo = page.answerSetIdToPieceStyleNoMap[blankPart.answerSet.id];
          assertNonNullable(pieceStyleNo);
          const presentation = presentations.find(({ slot }) =>
            slot.page === page && slot.blank === blankPart && slot.partIndex === partI && slot.pageNo === pageNo);
          const { metrics, ...rect } = pw.addPieceSlot(playerGuess, pieceStyleNo, {
            offsetX:presentation?.offsetX ?? 0, scale:presentation?.scale ?? 1,
            glintAngle:glints.find(glint => glint.page === page && glint.blank === blankPart)?.angle ?? null
          });
          slotLayouts?.push({ page, pageNo, partIndex:partI, blank:blankPart, styleNo:pieceStyleNo, rect, metrics });
        }
      break;

      case ClozePartType.separator:
        pw.addDivider('rule');
      break;

      case ClozePartType.text:
        pw.addText((part as ClozeText).text);
      break;

      case ClozePartType.image:
        assert(_isClozeImageUrlResolved(part));
        pw.addImage((part as ClozeImage).imageUrl as string, 2);
      break;

      default:
        botch();
    }
  }
  const instructionText = getConclusionPageInstructionText(page.conclusion);
  pw.jump(0, 100-pw.getLineHeight('m')-pw.getLineHeight('s'));
  pw.addTextLine(instructionText, 'center', 'black', messageAlpha);
}

function _createLockedPageClipPath(rect:Rect, isLeftPage:boolean):Path2D {
  const bindingX = isLeftPage ? rect.x + rect.width : rect.x;
  const outerX = isLeftPage ? rect.x : rect.x + rect.width;
  const direction = isLeftPage ? -1 : 1;
  const curveWidth = rect.width * .105;
  const curveDepth = rect.height * .015;
  const flatX = bindingX + direction * curveWidth;
  const bottom = rect.y + rect.height;
  const path = new Path2D();

  path.moveTo(bindingX, rect.y + curveDepth);
  path.bezierCurveTo(bindingX + direction * curveWidth * .3, rect.y + curveDepth * .3,
    bindingX + direction * curveWidth * .65, rect.y, flatX, rect.y);
  path.lineTo(outerX, rect.y);
  path.lineTo(outerX, bottom);
  path.lineTo(flatX, bottom);
  path.bezierCurveTo(bindingX + direction * curveWidth * .65, bottom,
    bindingX + direction * curveWidth * .3, bottom + curveDepth * .3, bindingX, bottom + curveDepth);
  path.closePath();
  return path;
}

export function drawLockedConclusionPage(metaTime:number, innerPageRect:Rect, isLeftPage:boolean, pw:PageWriter,
    context:CanvasRenderingContext2D) {
  const topPercent = pw.getCursorYPercent();
  const bottomPercent = 100 - 2 * pw.getLineHeight('s');
  assert(topPercent < bottomPercent);
  const left = innerPageRect.x;
  const right = left + innerPageRect.width;
  const top = innerPageRect.y + innerPageRect.height * topPercent / 100;
  const bottom = innerPageRect.y + innerPageRect.height * bottomPercent / 100;
  const clipPath = _createLockedPageClipPath({ x:left, y:top, width:right - left, height:bottom - top }, isLeftPage);

  drawObscuredPolygon([
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ], context, metaTime, clipPath);

  const middleTextHeight = pw.getLineHeight('m') * 3;
  pw.jump(0, 50 - (middleTextHeight / 2));
  pw.setFontSize('m');
  pw.addTextLine('This conclusion is locked.', 'center', 'red');
  pw.addDivider('tripleDot');
  pw.addTextLine('Claim another conclusion\nfrom this chapter to unlock it.', 'center', 'red');

}