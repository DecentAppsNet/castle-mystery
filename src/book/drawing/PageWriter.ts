/* This file manages percentage-based book-page placement, cursor movement, and text wrapping.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas text placement is verified visually. @preserve */

import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";
import { drawIllumination } from "./illuminationDrawUtil";
import { ImageSet } from "@/imageLoading";
import { drawPageDivider, drawPagePieceSlot, drawPageTextLine, getIlluminatedTextSections,
  splitTextToLines } from "./pageWriterUtil";
import { measureBookTextBox } from "./bookTextDrawUtil";
import DividerStyle from "./types/DividerStyle";

type FontSize = 'xs' | 's' | 'm' | 'l' | 'xl';
type ColorName = 'black' | 'red' | 'grey';
type TextJustification = 'left' | 'right' | 'center';

const TEXT_FLOW_RIGHT_MARGIN_PERCENT = 2;
const TEXT_PAD_Y = .006;
const TAB_COLUMN_WIDTH_PERCENT = 25;
const ILLUMINATION_WIDTH_PERCENT_OF_PAGE_HEIGHT = 20;
const ILLUMINATION_HEIGHT_PERCENT_OF_PAGE_HEIGHT = 20;

// Font sizes expressed as fractions of page height.
const fontSizeToLineHeight = {
  'xs': .03,
  's': .04,
  'm': .05,
  'l': .06,
  'xl': .1
};

const colorNameToHex:Record<ColorName, string> = {
  'black': '#392b20',
  'grey': '#777777',
  'red': '#9e302c'
}

class PageWriter {
  private _pageRect:Rect;
  private _context:CanvasRenderingContext2D;
  private _fontSize:FontSize;
  private _cursorPoint:Point; // Units are percentages of pageRect width and height.
  private _imageSet:ImageSet;
  private _textFlowObstacleEnd:Point|null = null;

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

  private _getTextFontSizePixels():number {
    return this._pageRect.height * (this.getLineHeight() / 100 - TEXT_PAD_Y * 2);
  }

  private _getTextY():number {
    return this._pageRect.y + this._pageRect.height * (this._cursorPoint[1] / 100 + TEXT_PAD_Y);
  }

  // Draws text on its own line, based on Y position of cursor and specified justification. (X position of cursor ignored.)
  // Embedded line breaks draw separate lines; each advances the cursor by line height with X reset to 0%.
  addTextLine(text:string, justification:TextJustification = 'center', colorName:ColorName = 'black') {
    const xRatio = justification === 'left' ? 0 : justification === 'right' ? 1 : .5;
    const x = this._pageRect.x + this._pageRect.width * xRatio;
    const lines = splitTextToLines(text);
    const fontSizePixels = this._getTextFontSizePixels();
    for (const line of lines) {
      const y = this._getTextY();
      drawPageTextLine(line, x, y, this._pageRect.width, fontSizePixels, justification,
        colorNameToHex[colorName], this._context);
      this.addLineBreak();
    }
  }

  private _writeChunk(text:string, isUnderlined:boolean = false) {
    const x = this._pageRect.x + this._pageRect.width * this._cursorPoint[0] / 100;
    const y = this._getTextY();
    const width = this._context.measureText(text).width;
    this._context.fillText(text, x, y);
    if (isUnderlined) {
      const fontSizePixels = this._getTextFontSizePixels();
      this._context.fillRect(x, y + fontSizePixels * .98, width, fontSizePixels * .035);
    }
    this._cursorPoint = [this._cursorPoint[0] + width / this._pageRect.width * 100,
      this._cursorPoint[1]];
  }

  private _getLineStartXPercent():number {
    if (this._textFlowObstacleEnd && this._cursorPoint[1] >= this._textFlowObstacleEnd[1]) this._textFlowObstacleEnd = null;
    return this._textFlowObstacleEnd ? this._textFlowObstacleEnd[0] : 0;
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

    // Break oversized words within each line's available width beside the obstacle.
    let chunk = '';
    for (const character of word) {
      if (chunk !== '' && this._context.measureText(chunk + character).width > this._getRemainingWidth()) {
        this._writeChunk(chunk, isUnderlined);
        this.addLineBreak();
        chunk = '';
      }
      while (chunk === '' && this._textFlowObstacleEnd &&
          this._context.measureText(character).width > this._getRemainingWidth()) this.addLineBreak();
      chunk += character;
    }
    this._writeChunk(chunk, isUnderlined);
  }

  private _placeTextFlowObstacle(width:number, height:number):Rect {
    const yPercent = this._textFlowObstacleEnd
      ? Math.max(this._cursorPoint[1], this._textFlowObstacleEnd[1]) : this._cursorPoint[1];
    this._textFlowObstacleEnd = [
      width / this._pageRect.width * 100 + TEXT_FLOW_RIGHT_MARGIN_PERCENT,
      yPercent + height / this._pageRect.height * 100
    ];
    this._cursorPoint = [this._textFlowObstacleEnd[0], yPercent];
    return { x:this._pageRect.x, y:this._pageRect.y + yPercent / 100 * this._pageRect.height, width, height };
  }

  addIllumination(letter:string) {
    const width = this._pageRect.height * ILLUMINATION_WIDTH_PERCENT_OF_PAGE_HEIGHT / 100;
    const height = this._pageRect.height * ILLUMINATION_HEIGHT_PERCENT_OF_PAGE_HEIGHT / 100;
    const destination = this._placeTextFlowObstacle(width, height);
    drawIllumination(letter, destination.x, destination.y, width, height, this._imageSet, this._context);
  }

  // Draws an image on left side of page at cursor Y. Text will flow around it. The lineCount param is used to determine 
  // the destination height of the image. Destination width is scaled to maintain the aspect ratio of visible content.
  addImage(url:string, lineCount:number = 3) {
    assert(Number.isFinite(lineCount) && lineCount > 0);
    const imageAsset = this._imageSet.findImage(url);
    const height = this._pageRect.height * this.getLineHeight() * lineCount / 100;
    if (!imageAsset) {
      const destination = this._placeTextFlowObstacle(height, height);
      drawPageTextLine('?', destination.x + height / 2, destination.y + height * .1,
        height, height * .8, 'center', colorNameToHex.black, this._context);
      return;
    }

    const sourceRect = imageAsset.visibleSourceRect;
    if (!sourceRect) return;

    const width = height * sourceRect.width / sourceRect.height;
    const destination = this._placeTextFlowObstacle(width, height);
    this._imageSet.drawImage(imageAsset, destination.x, destination.y, width, height, this._context);
  }

  private _findNextTabXPercent():number {
    const nextTabColumn = Math.floor(this._cursorPoint[0] / TAB_COLUMN_WIDTH_PERCENT) + 1;
    return Math.min(nextTabColumn * TAB_COLUMN_WIDTH_PERCENT, 100);
  }

  // Draws text at current X,Y position of cursor with word-wrapping. One or more calls can be made to append portions of text.
  // Advances cursor to next position for outputting more text continuing from the last character of this text.
  addText(text:string, colorName:ColorName = 'black', isUnderlined:boolean = false) {
    this._context.save();
    this._context.fillStyle = colorNameToHex[colorName];
    this._context.font = `${this._getTextFontSizePixels()}px im-fell-english, serif`;
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
      } else if (character === '\t') {
        this._cursorPoint = [this._findNextTabXPercent(), this._cursorPoint[1]];
      } else if (character !== '\r') {
        if (isUnderlined) {
          this._writeChunk(' ', true);
        } else {
          const spaceWidth = this._context.measureText(' ').width;
          this._cursorPoint = [this._cursorPoint[0] + spaceWidth / this._pageRect.width * 100, this._cursorPoint[1]];
        }
      }
    }
    this._writeWord(word, isUnderlined);
    this._context.restore();
  }

  addPieceSlot(text:string, styleNo:number = -1) {
    const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
    const { width, padding, fontSizePixels } = measureBookTextBox(text, this._pageRect.width,
      lineHeight, this._context, this._getTextFontSizePixels());
    if (width > this._getRemainingWidth() && this._cursorPoint[0] > this._getLineStartXPercent()) this.addLineBreak();
    while (this._textFlowObstacleEnd && width > this._getRemainingWidth()) this.addLineBreak();

    const x = this._pageRect.x + this._pageRect.width * this._cursorPoint[0] / 100;
    const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
    drawPagePieceSlot(text, x, y, width, lineHeight, padding, fontSizePixels,
      colorNameToHex.black, styleNo, this._context);
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
  // leave an empty line when advancing to next line. Lines beside an obstacle start at its right edge.
  addLineBreak() {
    this._cursorPoint = [0, this._cursorPoint[1] + this.getLineHeight()];
    this._cursorPoint = [this._getLineStartXPercent(), this._cursorPoint[1]];
  }

  private _startFullWidthLine():void {
    if (this._cursorPoint[0] !== this._getLineStartXPercent()) this.addLineBreak();
    while (this._textFlowObstacleEnd) this.addLineBreak();
  }

  // Draws a divider on a fresh full-width line, skipping any text flow obstacle, then advances to the next line.
  // Uses the current font size to determine line height and vertically centers the divider within that height.
  addDivider(dividerStyle:DividerStyle = 'rule', colorName:ColorName = 'red') {
    this._startFullWidthLine();
    const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
    drawPageDivider(this._pageRect, this._cursorPoint[1], lineHeight, dividerStyle,
      colorNameToHex[colorName], this._context);
    this.addLineBreak();
  }

  // Draws a single button horizontally centered on a fresh full-width line, skipping any text flow obstacle, 
  // then advances to the next line. Uses the current font size to determine button height.
  addButton(text:string) {
    this._startFullWidthLine();
    const lineHeight = this._pageRect.height * this.getLineHeight() / 100;
    const { width, padding, fontSizePixels } = measureBookTextBox(text, this._pageRect.width,
      lineHeight, this._context, this._getTextFontSizePixels());
    const centerX = this._pageRect.x + this._pageRect.width / 2;
    const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;

    this._context.save();
    this._context.globalAlpha = 1;
    this._context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this._context.fillRect(centerX - width / 2, y, width, lineHeight);
    drawPageTextLine(text, centerX, y + (lineHeight - fontSizePixels) / 2, width - padding * 2,
      fontSizePixels, 'center', '#ffffff', this._context);
    this._context.restore();
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
    this._textFlowObstacleEnd = null;
    this._cursorPoint = [xPercent, yPercent];
  }
}

export default PageWriter;