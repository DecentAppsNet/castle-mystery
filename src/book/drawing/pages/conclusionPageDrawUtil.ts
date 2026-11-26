/* This file draws conclusion content, answer slots, instructions, and locked-conclusion overlays.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import ConclusionPage from "@/book/types/ConclusionPage";
import { assert, assertNonNullable, botch } from "decent-portal";
import PageWriter from "./PageWriter";
import ClozePartType from "@/conclusions/types/ClozePartType";
import ClozeText from "@/conclusions/types/ClozeText";
import { drawObscuredPage } from './obscuredPageDrawUtil';
import ClozeBlank from "@/conclusions/types/ClozeBlank";
import ClozeImage from "@/conclusions/types/ClozeImage";
import PieceSlotLayout from "../types/PieceSlotLayout";
import PieceSlotPresentation from "@/book/types/PieceSlotPresentation";
import { getConclusionPageInstructionText } from '@/book/claiming';
import BookClaimGlint from '@/book/claiming/types/BookClaimGlint';
import ClozePart from "@/conclusions/types/ClozePart";

function _isClozeImageUrlResolved(part:ClozePart) {
  return typeof (part as ClozeImage).imageUrl === 'string'; // If it's an array, then there was no resolution of candidate URLs to a single URL performed.
}

export function drawConclusionPage(page:ConclusionPage, pw:PageWriter, pageNo:number, slotLayouts:PieceSlotLayout[]|null,
  presentations:readonly PieceSlotPresentation[], glints:readonly BookClaimGlint[], messageAlpha:number) {
  // Draw parts in file order, retaining the actual mutable blank identity.
  pw.setFontSize('m');
  for(let partI = 0; partI < page.conclusion.parts.length; ++partI) {
    const part = page.conclusion.parts[partI];
    const tweak = page.layoutTweaks[partI];
    let drawInline = true;
    if (tweak?.isHidden) continue;
    if (tweak?.cursorPoint) { pw.jump(tweak.cursorPoint[0], tweak.cursorPoint[1]); drawInline = false; }
    switch(part.type) {
      case ClozePartType.blank:
        const blankPart = part as ClozeBlank;
        const playerGuess = blankPart.answerSet.answers[blankPart.playerAnswerIndex] ?? '';
        if (page.conclusion.isComplete) pw.addText(playerGuess, 'black', true, drawInline);
        else {
          const pieceStyleNo = page.answerSetIdToPieceStyleNoMap[blankPart.answerSet.id];
          assertNonNullable(pieceStyleNo);
          const presentation = presentations.find(({ slot }) =>
            slot.page === page && slot.blank === blankPart && slot.partIndex === partI && slot.pageNo === pageNo);
          const animationStyle = {
            offsetX:presentation?.offsetX ?? 0, scale:presentation?.scale ?? 1,
            glintAngle:glints.find(glint => glint.page === page && glint.blank === blankPart)?.angle ?? null
          }
          const { metrics, ...rect } = pw.addPieceSlot(playerGuess, pieceStyleNo, animationStyle, drawInline);
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
        if (tweak?.cursorPoint) pw.jump(tweak.cursorPoint[0], tweak.cursorPoint[1]);
        pw.addImage((part as ClozeImage).imageUrl as string, 2, drawInline);
      break;

      default:
        botch();
    }
  }
  const instructionText = getConclusionPageInstructionText(page.conclusion);
  pw.jump(0, 100-pw.getLineHeight('m')-pw.getLineHeight('s'));
  pw.addTextLine(instructionText, 'center', 'black', messageAlpha);
}

export function drawLockedConclusionPage(metaTime:number, innerPageRect:Rect, isLeftPage:boolean, pw:PageWriter,
    context:CanvasRenderingContext2D) {
  drawObscuredPage(metaTime, innerPageRect, isLeftPage, pw, context);
  const middleTextHeight = pw.getLineHeight('m') * 3;
  pw.jump(0, 50 - (middleTextHeight / 2));
  pw.setFontSize('m');
  pw.addTextLine('This conclusion is locked.', 'center', 'red');
  pw.addDivider('tripleDot');
  pw.addTextLine('Claim another conclusion\nfrom this chapter to unlock it.', 'center', 'red');

}