/* This file draws chapter end pages.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import ChapterEndPage from "@/book/types/ChapterEndPage";
import PageWriter from "./PageWriter";
import Rect from '@/game/types/Rect';
import { drawObscuredPage } from './obscuredPageDrawUtil';
import { areAllRequiredConclusionsComplete } from '@/book/claiming';

export function drawChapterEndPage(page:ChapterEndPage, pw:PageWriter, metaTime:number, innerPageRect:Rect,
    context:CanvasRenderingContext2D) {
  const isChapterComplete = areAllRequiredConclusionsComplete(page.conclusions);
  if (isChapterComplete) {
    pw.setFontSize('m');
    pw.addText(page.winSynopsis);

    return;
  }

  drawObscuredPage(metaTime, innerPageRect, false, pw, context);
  const middleTextHeight = pw.getLineHeight('m') * 3;
  pw.jump(0, 50 - (middleTextHeight / 2));
  pw.setFontSize('m');
  pw.addTextLine('The chapter end is locked.', 'center', 'red');
  pw.addDivider('tripleDot');
  pw.addTextLine('Claim all required conclusions\nfrom this chapter to unlock it.', 'center', 'red');
}