/* This file counts completed conclusions and shame marks and draws chapter tally pages.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import ChapterEndPage from "@/book/types/ChapterEndPage";
import PageWriter from "./PageWriter";

export function drawChapterEndPage(page:ChapterEndPage, pw:PageWriter) {
  // TODO - treat as a blank page if conclusions not claimed.
  pw.setFontSize('m');
  pw.addText(page.winSynopsis);
}