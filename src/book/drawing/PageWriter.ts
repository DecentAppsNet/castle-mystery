/* This file manages percentage-based book-page placement, cursor movement, and text wrapping.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas text placement is verified visually. @preserve */

import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";
import { drawIllumination } from "./illuminationDrawUtil";
import { ImageSet } from "@/imageLoading";
import { drawPageDivider, drawPageTextBox, drawPageTextLine, getIlluminatedTextSections,
  measurePageTextBox, splitTextToLines } from "./pageWriterUtil";
import DividerStyle from "./types/DividerStyle";

type FontSize = 'xs' | 's' | 'm' | 'l' | 'xl';
type ColorName = 'black' | 'red';
type TextJustification = 'left' | 'right' | 'center';

const ILLUMINATION_RIGHT_MARGIN_PERCENT = 2;
const ILLUMINATION_WIDTH_PERCENT_OF_PAGE_HEIGHT = 20;
const ILLUMINATION_HEIGHT_PERCENT_OF_PAGE_HEIGHT = 20;

// Font sizes expressed as fractions of page height.
const fontSizeToLineHeight = {
  'xs': .02,
  's': .03,
  'm': .04,
  'l': .06,
  'xl': .1
};

const colorNameToHex:Record<ColorName, string> = {
  'black': '#392b20',
  'red': '#9e302c'
}

class PageWriter {
  private _pageRect:Rect;
  private _context:CanvasRenderingContext2D;
  private _fontSize:FontSize;
  private _cursorPoint:Point; // Units are percentages of pageRect width and height.
  private _imageSet:ImageSet;
  private _illuminationEnd:Point|null = null;

  constructor(pageRect:Rect, imageSet:ImageSet, context:CanvasRenderingContext2D) {
    assert(pageRect.width > 0 && pageRect.height > 0);
    assert(!context.isContextLost());
    assert(context.canvas.width > 0 && context.canvas.height > 0);
    this._pageRect = pageRect;
    this._context = context;
    this._fontSize = 'm';
    this._cursorPoint = [0, 0]; // Top-left of page rect.
    this._imageSet = imageSet;
  }

  setFontSize(fontSize:FontSize) {
    this._fontSize = fontSize;
  }

  // Draws text on its own line, based on Y position of cursor and specified justification. (X position of cursor ignored.)
  // Embedded line breaks draw separate lines; each advances the cursor by line height with X reset to 0%.
  addTextLine(text:string, justification:TextJustification = 'center', colorName:ColorName = 'black') {
    const lineHeight = this.getLineHeight();
    const xRatio = justification === 'left' ? 0 : justification === 'right' ? 1 : .5;
    const x = this._pageRect.x + this._pageRect.width * xRatio;
    const lines = splitTextToLines(text);
    const fontSizePixels = this._pageRect.height * lineHeight / 100;
    for (const line of lines) {
      const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
      drawPageTextLine(line, x, y, this._pageRect.width, fontSizePixels, justification,
        colorNameToHex[colorName], this._context);
      this.addLineBreak();
    }
  }

  private _writeChunk(text:string, isUnderlined:boolean = false) {
    const x = this._pageRect.x + this._pageRect.width * this._cursorPoint[0] / 100;
    const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
    const width = this._context.measureText(text).width;
    this._context.fillText(text, x, y);
    if (isUnderlined) {
      const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
      this._context.fillRect(x, y + lineHeight * .98, width, lineHeight * .035);
    }
    this._cursorPoint = [this._cursorPoint[0] + width / this._pageRect.width * 100,
      this._cursorPoint[1]];
  }

  private _getLineStartXPercent():number {
    if (this._illuminationEnd && this._cursorPoint[1] >= this._illuminationEnd[1]) this._illuminationEnd = null;
    return this._illuminationEnd ? this._illuminationEnd[0] : 0;
  }

  private _getRemainingWidth():number {
    return this._pageRect.width * (1 - this._cursorPoint[0] / 100);
  }

  private _writeWord(word:string, isUnderlined:boolean = false) {
    if (word === '') return;
    const width = this._context.measureText(word).width;
    if (this._cursorPoint[0] > this._getLineStartXPercent() && width > this._getRemainingWidth()) this.addLineBreak();
    if (width <= this._getRemainingWidth()) {
      this._writeChunk(word, isUnderlined);
      return;
    }

    // Break oversized words within each line's available width beside the illumination.
    let chunk = '';
    for (const character of word) {
      if (chunk !== '' && this._context.measureText(chunk + character).width > this._getRemainingWidth()) {
        this._writeChunk(chunk, isUnderlined);
        this.addLineBreak();
        chunk = '';
      }
      while (chunk === '' && this._illuminationEnd &&
          this._context.measureText(character).width > this._getRemainingWidth()) this.addLineBreak();
      chunk += character;
    }
    this._writeChunk(chunk, isUnderlined);
  }

  addIllumination(letter:string) {
    const canvasX = this._pageRect.x;
    const canvasY = this._pageRect.y + (this._cursorPoint[1]/100 * this._pageRect.height);
    const width = this._pageRect.height * ILLUMINATION_WIDTH_PERCENT_OF_PAGE_HEIGHT / 100;
    const height = this._pageRect.height * ILLUMINATION_HEIGHT_PERCENT_OF_PAGE_HEIGHT / 100;
    drawIllumination(letter, canvasX, canvasY, width, height, this._imageSet, this._context);
    this._illuminationEnd = [
      width / this._pageRect.width * 100 + ILLUMINATION_RIGHT_MARGIN_PERCENT,
      this._cursorPoint[1] + height / this._pageRect.height * 100
    ];
    this._cursorPoint = [this._illuminationEnd[0], this._cursorPoint[1]];
  }

  // Draws an image on left side of page at cursor Y. Text will flow around it. The lineCount param is used to determine 
  // the destination height of the image. Destination width will be calculated be scaling source width of image to
  // match destination height while maintaining aspect ratio of source image.
  addImage(_url:string, _lineCount:number = 3) {
    // TODO
  }

  // Draws text at current X,Y position of cursor with word-wrapping. One or more calls can be made to append portions of text.
  // Advances cursor to next position for outputting more text continuing from the last character of this text.
  addText(text:string, colorName:ColorName = 'black', isUnderlined:boolean = false) {
    this._context.save();
    this._context.fillStyle = colorNameToHex[colorName];
    this._context.font = `${this._pageRect.height * this.getLineHeight() / 100}px im-fell-english, serif`;
    this._context.textAlign = 'left';
    this._context.textBaseline = 'top';

    // Measure complete words before placing them, keeping whitespace and explicit line breaks.
    let word = '';
    for (const character of text) {
      if (character !== ' ' && character !== '\t' && character !== '\n' && character !== '\r') {
        word += character;
        continue;
      }
      this._writeWord(word, isUnderlined);
      word = '';
      if (character === '\n') {
        this.addLineBreak();
      } else if (character !== '\r') {
        const whitespace = character === '\t' ? '    ' : ' ';
        if (isUnderlined) {
          this._writeChunk(whitespace, true);
        } else {
          const spaceWidth = this._context.measureText(whitespace).width;
          this._cursorPoint = [this._cursorPoint[0] + spaceWidth / this._pageRect.width * 100, this._cursorPoint[1]];
        }
      }
    }
    this._writeWord(word, isUnderlined);
    this._context.restore();
  }

  addTextBox(text:string) {
    const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
    const { width, padding, fontSizePixels } = measurePageTextBox(text, this._pageRect.width,
      lineHeight, this._context);
    if (width > this._getRemainingWidth() && this._cursorPoint[0] > this._getLineStartXPercent()) this.addLineBreak();
    while (this._illuminationEnd && width > this._getRemainingWidth()) this.addLineBreak();

    const x = this._pageRect.x + this._pageRect.width * this._cursorPoint[0] / 100;
    const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
    drawPageTextBox(text, x, y, width, lineHeight, padding, fontSizePixels,
      colorNameToHex.black, this._context);
    this._cursorPoint = [this._cursorPoint[0] + width / this._pageRect.width * 100, this._cursorPoint[1]];
  }

  addIlluminatedText(text:string, colorName:ColorName = 'black') {
    if (!text.length) return;
    const { firstLetter, firstWord, theRest } = getIlluminatedTextSections(text);
    this.addIllumination(firstLetter);
    this._cursorPoint = [this._cursorPoint[0] - 2, this._cursorPoint[1]]; // Nudge first word slightly to left to visually connect it to illumination.
    this.addText(firstWord, 'red');
    this.addText(theRest, colorName);
  }

  // Advances cursor to start of next line, based on current font height. If already at the start of an empty line, this will
  // leave an empty line when advancing to next line. Lines beside an illumination start at its right edge.
  addLineBreak() {
    this._cursorPoint = [0, this._cursorPoint[1] + this.getLineHeight()];
    this._cursorPoint = [this._getLineStartXPercent(), this._cursorPoint[1]];
  }

  // Draws a divider across the page rect and advances cursor to next line. Uses the current font size to determine
  // line height and vertically centers the line within that height.
  addDivider(dividerStyle:DividerStyle = 'rule', colorName:ColorName = 'red') {
    const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
    drawPageDivider(this._pageRect, this._cursorPoint[1], lineHeight, dividerStyle,
      colorNameToHex[colorName], this._context);
    this.addLineBreak();
  }

  getCursorYPercent():number {
    return this._cursorPoint[1];
  }

  getLineHeight(fontSize:FontSize = this._fontSize):number {
    const percent = fontSizeToLineHeight[fontSize];
    assert(Number.isFinite(percent));
    return percent * 100;
  }

  getTextLineHeight(text:string, fontSize:FontSize = this._fontSize):number {
    const lines = splitTextToLines(text);
    return lines.length * this.getLineHeight(fontSize);
  }

  // Moves cursor to a specific place in page rect.
  jump(xPercent:number, yPercent:number):void {
    this._illuminationEnd = null;
    this._cursorPoint = [xPercent, yPercent];
  }
}

export default PageWriter;