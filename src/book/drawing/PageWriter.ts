/* This file provides percentage-based canvas text placement within a book page.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas text placement is verified visually. @preserve */

import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";
import { drawIllumination } from "./illuminationDrawUtil";
import ImageSet from "@/game/types/ImageSet";

type FontSize = 'xs' | 's' | 'm' | 'l' | 'xl';
type ColorName = 'dkBrown' | 'red';
type TextJustification = 'left' | 'right' | 'center';
type DividerStyle = 'rule' | 'diamondCentered' | 'tripleDot';

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

const colorNameToHex = {
  'dkBrown': '#392b20',
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
  addTextLine(text:string, justification:TextJustification = 'center', colorName:ColorName = 'dkBrown') {
    const lineHeight = this.getLineHeight();
    const xRatio = justification === 'left' ? 0 : justification === 'right' ? 1 : .5;
    const x = this._pageRect.x + this._pageRect.width * xRatio;
    const lines = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');

    // Keep text styling local to this line so callers retain their canvas state.
    this._context.save();
    this._context.fillStyle = colorNameToHex[colorName];
    this._context.font = `${this._pageRect.height * lineHeight / 100}px im-fell-english, serif`;
    this._context.textAlign = justification;
    this._context.textBaseline = 'top';
    for (const line of lines) {
      const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
      this._context.fillText(line, x, y, this._pageRect.width);
      this.addLineBreak();
    }
    this._context.restore();
  }

  private _writeChunk(text:string) {
    const x = this._pageRect.x + this._pageRect.width * this._cursorPoint[0] / 100;
    const y = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100;
    this._context.fillText(text, x, y);
    this._cursorPoint = [this._cursorPoint[0] + this._context.measureText(text).width / this._pageRect.width * 100,
      this._cursorPoint[1]];
  }

  private _getLineStartXPercent():number {
    if (this._illuminationEnd && this._cursorPoint[1] >= this._illuminationEnd[1]) this._illuminationEnd = null;
    return this._illuminationEnd ? this._illuminationEnd[0] : 0;
  }

  private _getRemainingWidth():number {
    return this._pageRect.width * (1 - this._cursorPoint[0] / 100);
  }

  private _writeWord(word:string) {
    if (word === '') return;
    const width = this._context.measureText(word).width;
    if (this._cursorPoint[0] > this._getLineStartXPercent() && width > this._getRemainingWidth()) this.addLineBreak();
    if (width <= this._getRemainingWidth()) {
      this._writeChunk(word);
      return;
    }

    // Break oversized words within each line's available width beside the illumination.
    let chunk = '';
    for (const character of word) {
      if (chunk !== '' && this._context.measureText(chunk + character).width > this._getRemainingWidth()) {
        this._writeChunk(chunk);
        this.addLineBreak();
        chunk = '';
      }
      while (chunk === '' && this._illuminationEnd &&
          this._context.measureText(character).width > this._getRemainingWidth()) this.addLineBreak();
      chunk += character;
    }
    this._writeChunk(chunk);
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

  // Draws text at current X,Y position of cursor with word-wrapping. One or more calls can be made to append portions of text.
  // Advances cursor to next position for outputting more text continuing from the last character of this text.
  addText(text:string, colorName:ColorName = 'dkBrown') {
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
      this._writeWord(word);
      word = '';
      if (character === '\n') {
        this.addLineBreak();
      } else if (character !== '\r') {
        const spaceWidth = this._context.measureText(character === '\t' ? '    ' : ' ').width;
        this._cursorPoint = [this._cursorPoint[0] + spaceWidth / this._pageRect.width * 100, this._cursorPoint[1]];
      }
    }
    this._writeWord(word);
    this._context.restore();
  }

  addIlluminatedText(text:string, colorName:ColorName = 'dkBrown') {
    if (!text.length) return;
    const firstLetter = text[0];
    const theRest = text.substring(1);
    this.addIllumination(firstLetter);
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
    const centerX = this._pageRect.x + this._pageRect.width / 2;
    const centerY = this._pageRect.y + this._pageRect.height * this._cursorPoint[1] / 100 + lineHeight / 2;
    const halfWidth = this._pageRect.width * .4;
    const ornamentSize = Math.min(lineHeight * .3, this._pageRect.width * .03);
    const context = this._context;

    // Keep divider styling independent of surrounding text and canvas paths.
    context.save();
    context.strokeStyle = colorNameToHex[colorName];
    context.fillStyle = context.strokeStyle;
    context.lineWidth = Math.min(lineHeight * .06, this._pageRect.width * .006);
    context.setLineDash([]);
    context.beginPath();

    switch (dividerStyle) {
      case 'rule':
        context.lineCap = 'round';
        context.moveTo(centerX - halfWidth, centerY);
        context.lineTo(centerX + halfWidth, centerY);
        context.stroke();
        break;
      case 'diamondCentered': {
        const gap = ornamentSize * 1.35;
        context.lineCap = 'butt';
        context.moveTo(centerX - halfWidth, centerY);
        context.lineTo(centerX - gap, centerY);
        context.moveTo(centerX + gap, centerY);
        context.lineTo(centerX + halfWidth, centerY);
        context.stroke();
        context.beginPath();
        context.moveTo(centerX, centerY - ornamentSize);
        context.lineTo(centerX + ornamentSize, centerY);
        context.lineTo(centerX, centerY + ornamentSize);
        context.lineTo(centerX - ornamentSize, centerY);
        context.closePath();
        context.fill();
        break;
      }
      case 'tripleDot':
        for (const offset of [-1, 0, 1]) {
          const dotX = centerX + offset * ornamentSize * 1.8;
          context.moveTo(dotX + ornamentSize * .42, centerY);
          context.arc(dotX, centerY, ornamentSize * .42, 0, Math.PI * 2);
        }
        context.fill();
        break;
      default:
        assert(false, 'Unknown divider style');
    }
    context.restore();
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

  // Moves cursor to a specific place in page rect.
  jump(xPercent:number, yPercent:number):void {
    this._illuminationEnd = null;
    this._cursorPoint = [xPercent, yPercent];
  }
}

export default PageWriter;