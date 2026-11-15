/* This file provides text-section parsing, text measurement, and stateless page drawing for PageWriter.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";
import DividerStyle from "./types/DividerStyle";
import PageTextBoxMetrics from "./types/PageTextBoxMetrics";

export function splitTextToLines(text:string):string[] {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
}

function _canvasFont(fontSizePixels:number) {
  return `${fontSizePixels}px im-fell-english, serif`;
}

export function getIlluminatedTextSections(text:string):{firstLetter:string, firstWord:string, theRest:string} {
  let firstLetter = '', firstWord = '', theRest = '';
  if (text.length === 0) return { firstLetter, firstWord, theRest };
  firstLetter = text[0];
  if (text.length === 1) return { firstLetter, firstWord, theRest };
  let endOfFirstWordI = text.indexOf(' ');
  if (endOfFirstWordI === -1) endOfFirstWordI = text.length;
  firstWord = text.substring(1, endOfFirstWordI).toLocaleUpperCase();
  if (endOfFirstWordI !== text.length) theRest = text.substring(endOfFirstWordI);
  return { firstLetter, firstWord, theRest };
}

/* v8 ignore next -- Text drawing is verified visually. @preserve */
export function drawPageTextLine(text:string, x:number, y:number, maxWidth:number, fontSizePixels:number,
    justification:CanvasTextAlign, colorHex:string, context:CanvasRenderingContext2D):void {
  // Keep text styling local to this line so callers retain their canvas state.
  context.save();
  context.fillStyle = colorHex;
  context.font = _canvasFont(fontSizePixels);
  context.textAlign = justification;
  context.textBaseline = 'top';
  context.fillText(text, x, y, maxWidth);
  context.restore();
}

/* v8 ignore next -- Canvas text sizing is verified visually. @preserve */
export function measurePageTextBox(text:string, pageWidth:number, lineHeight:number,
    context:CanvasRenderingContext2D):PageTextBoxMetrics {
  const padding = lineHeight * .15;
  let fontSizePixels = lineHeight;
  context.save();
  context.font = _canvasFont(fontSizePixels);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  let textWidth = context.measureText(text).width;
  const maxTextWidth = Math.max(pageWidth - padding * 2, pageWidth * .1);
  if (textWidth > maxTextWidth) {
    fontSizePixels *= maxTextWidth / textWidth;
    context.font = `${fontSizePixels}px im-fell-english, serif`;
    textWidth = context.measureText(text).width;
  }
  const width = text === '' ? pageWidth * .1 : textWidth + padding * 2;
  context.restore();
  return { width, padding, fontSizePixels };
}

/* v8 ignore next -- Text box drawing is verified visually. @preserve */
export function drawPageTextBox(text:string, x:number, y:number, width:number, lineHeight:number,
    padding:number, fontSizePixels:number, colorHex:string, context:CanvasRenderingContext2D):void {
  context.save();
  context.font = _canvasFont(fontSizePixels);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = '#c8b294';
  context.fillRect(x, y, width, lineHeight);
  context.strokeStyle = colorHex;
  context.lineWidth = lineHeight * .035;
  context.setLineDash([]);
  context.strokeRect(x, y, width, lineHeight);
  context.fillStyle = colorHex;
  context.fillText(text, x + padding, y);
  context.restore();
}

/* v8 ignore next -- Divider drawing is verified visually. @preserve */
export function drawPageDivider(pageRect:Rect, cursorYPercent:number, lineHeight:number,
    dividerStyle:DividerStyle, colorHex:string, context:CanvasRenderingContext2D):void {
  const centerX = pageRect.x + pageRect.width / 2;
  const centerY = pageRect.y + pageRect.height * cursorYPercent / 100 + lineHeight / 2;
  const halfWidth = pageRect.width * .4;
  const ornamentSize = Math.min(lineHeight * .3, pageRect.width * .03);

  // Keep divider styling independent of surrounding text and canvas paths.
  context.save();
  context.strokeStyle = colorHex;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = Math.min(lineHeight * .06, pageRect.width * .006);
  context.setLineDash([]);
  context.beginPath();

  switch (dividerStyle) {
    case 'rule':
      context.lineCap = 'round';
      context.moveTo(centerX - halfWidth, centerY);
      context.lineTo(centerX + halfWidth, centerY);
      context.stroke();
    break;

    case 'diamondCentered': 
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
}