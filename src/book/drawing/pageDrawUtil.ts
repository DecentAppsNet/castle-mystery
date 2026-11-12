/* This file draws book page headings, page numbers, and temporary content-bound outlines.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "../types/BookPage";
import { isLeftPageNo } from "./bookLayoutUtil";
import { assert, botch } from "decent-portal";
import PageWriter from "./PageWriter";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozeText from "@/game/conclusions/types/ClozeText";
import { drawObscuredPolygon } from "@/common/drawing/obscurePolygonDrawUtil";

const PAGE_OUTER_MARGIN = .12;
const PAGE_GUTTER_MARGIN = .05;
const PAGE_TOP_MARGIN = .04;
const PAGE_BOTTOM_MARGIN = .07;

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
  pw.setFontSize('xl');
  pw.addTextLine(page.title);
  pw.setFontSize('m');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addTextLine(`by ${page.author}`);
  pw.setFontSize('m');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addLineBreak();
  pw.addText(page.description);
}

type ChapterStartPage = Extract<BookPage, { kind:'chapterStart' }>;
function _drawChapterStartPage(page:ChapterStartPage, pw:PageWriter) {
  pw.setFontSize('l');
  pw.addTextLine(page.title);
  pw.addDivider('diamondCentered');
}


type ConclusionPage = Extract<BookPage, { kind:'conclusion' }>;
function _drawConclusionPage(page:ConclusionPage, pw:PageWriter) {
  pw.setFontSize('m');
  for(let partI = 0; partI < page.conclusion.parts.length; ++partI) {
    const part = page.conclusion.parts[partI];
    switch(part.type) {
      case ClozePartType.blank:
        pw.addText('[ ]');
      break;

      case ClozePartType.image:
        // TODO
      break;

      case ClozePartType.separator:
        pw.addDivider('rule');
      break;

      case ClozePartType.text:
        pw.addText((part as ClozeText).text);
      break;

      default:
        botch();
    }
  }
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

export function drawPage(page:BookPage, metaTime:number, pageNo:number, targetRect:Rect, context:CanvasRenderingContext2D) {
  const innerPageRect = _calcInnerPageRect(targetRect, pageNo);
  const pageWriter = new PageWriter(innerPageRect, context);

  // Place the heading and footer within the flat-paper bounds.
  pageWriter.setFontSize('s');
  if (page.headingText !== '') {
    pageWriter.addTextLine(_isLockedConclusionPage(page) ? 'Locked Conclusion' : page.headingText);
  } else {
    pageWriter.addLineBreak();
  }
  pageWriter.addLineBreak();

  switch(page.kind) {
    case 'bookStart': _drawBookStartPage(page, pageWriter); break;
    case 'chapterStart': _drawChapterStartPage(page, pageWriter); break;
    case 'conclusion': 
      if (_isLockedConclusionPage(page)) {
        _drawLockedConclusionPage(metaTime, innerPageRect, isLeftPageNo(pageNo), pageWriter, context);
      } else {
        _drawConclusionPage(page, pageWriter);
      }
      break;
    default:
      assert(page.kind === 'blank');
    break;
  }

  pageWriter.setFontSize('s');
  const lineHeight = pageWriter.getLineHeight();
  pageWriter.jump(0, 100 - lineHeight);
  pageWriter.addTextLine('-' + pageNo + '-');

}