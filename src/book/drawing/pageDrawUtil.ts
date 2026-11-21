/* This file draws book page headings, page numbers, and temporary content-bound outlines.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "../types/BookPage";
import { isLeftPageNo } from "./bookLayoutUtil";
import { assert, assertNonNullable, botch } from "decent-portal";
import PageWriter from "./PageWriter";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozeText from "@/game/conclusions/types/ClozeText";
import { drawObscuredPolygon } from "@/common/drawing/obscurePolygonDrawUtil";
import ClozeBlank from "@/game/conclusions/types/ClozeBlank";
import { ImageSet } from "@/imageLoading";
import { toNumeral } from "@/common/romanNumeralUtil";
import ClozeImage from "@/game/conclusions/types/ClozeImage";
import PieceSlotLayout from "./types/PieceSlotLayout";
import PieceSlotPresentation from "../types/PieceSlotPresentation";
import { getConclusionPageInstructionText } from '../bookClaimControlUtil';

const PAGE_OUTER_MARGIN = .16;
const PAGE_GUTTER_MARGIN = .05;
const PAGE_TOP_MARGIN = .04;
const PAGE_BOTTOM_MARGIN = .07;
const GLINT_PREVIEW_ROTATION_PERIOD_MSECS = 5000;

// Use percentage-based margins to return an inner page rect representing the part of the page that will look
// visually correct to draw text over. In other words, we want to draw text over the flat paper part of the image -
// not the curved paper, the book cover, or the side of pages.
function _calcInnerPageRect(pageRect:Rect, pageNo:number):Rect {
  const isLeftPage = isLeftPageNo(pageNo);
  const leftMargin = isLeftPage ? PAGE_OUTER_MARGIN : PAGE_GUTTER_MARGIN;
  return {
    x:pageRect.x + pageRect.width * leftMargin,
    y:pageRect.y + pageRect.height * PAGE_TOP_MARGIN,
    width:pageRect.width * (1 - PAGE_OUTER_MARGIN - PAGE_GUTTER_MARGIN),
    height:pageRect.height * (1 - PAGE_TOP_MARGIN - PAGE_BOTTOM_MARGIN)
  };
}

type BookStartPage = Extract<BookPage, { kind:'bookStart' }>;
function _drawBookStartPage(page:BookStartPage, pw:PageWriter) {
  const aboveDividerTextHeight = pw.getTextLineHeight(page.title, 'xl') +
    (page.subtitle === null ? 0 : pw.getLineHeight('m'));
  const dividerHeight = pw.getLineHeight('l');

  pw.jump(0, 50 - aboveDividerTextHeight - (dividerHeight / 2));

  pw.setFontSize('xl');
  pw.addTextLine(page.title);
  if (page.subtitle) {
    pw.setFontSize('m');
    pw.addTextLine(page.subtitle);
  }
  pw.setFontSize('l');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addTextLine(`by ${page.author}`);
}

type ChapterStartPage = Extract<BookPage, { kind:'chapterStart' }>;
function _drawChapterStartPage(page:ChapterStartPage, pw:PageWriter) {
  const aboveDividerTextHeight = pw.getLineHeight('l') + pw.getTextLineHeight(page.title, 'l');
  const dividerHeight = pw.getLineHeight('m');

  pw.jump(0, 50 - aboveDividerTextHeight - (dividerHeight / 2));

  pw.setFontSize('l');
  pw.addTextLine(`Chapter ${toNumeral(page.chapterNo)}`);
  pw.addTextLine(page.title);
  pw.setFontSize('m');
  pw.addDivider('rule');
  pw.addIlluminatedText(page.description);
}

type ConclusionPage = Extract<BookPage, { kind:'conclusion' }>;
function _drawConclusionPage(page:ConclusionPage, pw:PageWriter, pageNo:number, slotLayouts:PieceSlotLayout[]|null,
  presentations:readonly PieceSlotPresentation[], metaTime:number) {
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
            // Temporary preview: all slots share one rotating angle, including filled slots.
            glintAngle:(metaTime % GLINT_PREVIEW_ROTATION_PERIOD_MSECS) / GLINT_PREVIEW_ROTATION_PERIOD_MSECS * Math.PI * 2
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
        pw.addImage((part as ClozeImage).imageUrl as string, 2); // TODO figure out how to handle candidate URLs
      break;

      default:
        botch();
    }
  }
  const instructionText = getConclusionPageInstructionText(page.conclusion);
  pw.jump(0, 100-pw.getLineHeight('m')-pw.getLineHeight('s'));
  pw.addTextLine(instructionText);
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

function _drawLockedConclusionPage(metaTime:number, innerPageRect:Rect, isLeftPage:boolean, pw:PageWriter,
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

function _isLockedConclusionPage(page:BookPage) {
  return page.kind === 'conclusion' && page.conclusion.isLocked;
}

export function drawPage(page:BookPage, metaTime:number, pageNo:number, targetRect:Rect, imageSet:ImageSet,
  context:CanvasRenderingContext2D, slotLayouts:PieceSlotLayout[]|null = null,
  presentations:readonly PieceSlotPresentation[] = []) {
  // Create disposable placement state for this draw only.
  const innerPageRect = _calcInnerPageRect(targetRect, pageNo);
  const pageWriter = new PageWriter(innerPageRect, imageSet, context);

  // Place the heading and footer within the flat-paper bounds.
  pageWriter.setFontSize('s');
  if (page.headingText !== '') {
    pageWriter.addTextLine(_isLockedConclusionPage(page) ? 'Locked Conclusion' : page.headingText);
  } else {
    pageWriter.addLineBreak();
  }
  pageWriter.addLineBreak();

  // Only unlocked, incomplete conclusions publish slot geometry.
  switch(page.kind) {
    case 'bookStart': _drawBookStartPage(page, pageWriter); break;
    case 'chapterStart': _drawChapterStartPage(page, pageWriter); break;
    case 'conclusion': 
      if (_isLockedConclusionPage(page)) {
        _drawLockedConclusionPage(metaTime, innerPageRect, isLeftPageNo(pageNo), pageWriter, context);
      } else {
        _drawConclusionPage(page, pageWriter, pageNo, slotLayouts, presentations, metaTime);
      }
      break;
    default:
      assert(page.kind === 'blank');
    break;
  }

  // Keep the footer independent of the content cursor.
  pageWriter.setFontSize('s');
  const lineHeight = pageWriter.getLineHeight();
  pageWriter.jump(0, 100 - lineHeight);
  pageWriter.addTextLine('-' + pageNo + '-');

}