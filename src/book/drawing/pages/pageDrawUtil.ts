/* This file sets up shared book page layout, draws headings and footers, and dispatches page content rendering.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "@/book/types/BookPage";
import { isLeftPageNo } from "../bookLayoutUtil";
import { assert } from "decent-portal";
import PageWriter from "./PageWriter";
import { ImageSet } from "@/imageLoading";
import { toNumeral } from "@/common/romanNumeralUtil";
import PieceSlotLayout from "../types/PieceSlotLayout";
import PieceSlotPresentation from "@/book/types/PieceSlotPresentation";
import BookClaimGlint from '@/book/types/BookClaimGlint';
import { drawBookStartPage } from "./bookStartPageDrawUtil";
import { drawChapterStartPage } from "./chapterStartPageDrawUtil";
import { drawConclusionPage, drawLockedConclusionPage } from "./conclusionPageDrawUtil";
import { drawTallyPage } from "./tallyPageDrawUtil";
import { drawChapterEndPage } from "./chapterEndPageDrawUtil";

const PAGE_OUTER_MARGIN = .16;
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

function _isLockedConclusionPage(page:BookPage) {
  return page.kind === 'conclusion' && page.conclusion.isLocked;
}

function _concatPageHeadingText(page:BookPage) {
  if (page.kind === 'chapterStart' || page.kind === 'bookStart') return '';
  let concat = '';
  if (page.chapterNo !== 0) concat += `Chap. ${toNumeral(page.chapterNo)}`;
  if (!page.headingText) return concat;
  if (concat) concat += ` - `;
  concat += page.headingText;
  return concat;
}

export function drawPage(page:BookPage, metaTime:number, pageNo:number, targetRect:Rect, imageSet:ImageSet,
  context:CanvasRenderingContext2D, slotLayouts:PieceSlotLayout[]|null = null,
  presentations:readonly PieceSlotPresentation[] = [], glints:readonly BookClaimGlint[] = [], messageAlpha:number = 1) {
  // Create disposable placement state for this draw only.
  const innerPageRect = _calcInnerPageRect(targetRect, pageNo);
  const pageWriter = new PageWriter(innerPageRect, imageSet, context);

  // Place the heading and footer within the flat-paper bounds.
  pageWriter.setFontSize('s');
  const headingText = _concatPageHeadingText(page);
  if (headingText !== '') {
    pageWriter.addTextLine(headingText);
  } else {
    pageWriter.addLineBreak();
  }
  pageWriter.addLineBreak();

  // Only unlocked, incomplete conclusions publish slot geometry.
  switch(page.kind) {
    case 'bookStart': drawBookStartPage(page, pageWriter); break;
    case 'chapterStart': drawChapterStartPage(page, pageWriter); break;
    case 'conclusion': 
      if (_isLockedConclusionPage(page)) {
        drawLockedConclusionPage(metaTime, innerPageRect, isLeftPageNo(pageNo), pageWriter, context);
      } else {
        drawConclusionPage(page, pageWriter, pageNo, slotLayouts, presentations, glints, messageAlpha);
      }
      break;
    case 'tally':
      drawTallyPage(page, pageWriter);
    break;
    case 'chapterEnd':
      drawChapterEndPage(page, pageWriter);
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