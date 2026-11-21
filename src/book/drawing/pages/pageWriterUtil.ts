/* This file provides text-section parsing and stateless page drawing for PageWriter.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Rect from "@/game/types/Rect";
import { assert } from "decent-portal";
import { calcPieceBorderPolygon, getPieceSlotColor } from "../pieceDrawUtil";
import { bookCanvasFont, drawBorderedBookText } from "../bookTextDrawUtil";
import DividerStyle from "../types/DividerStyle";
import Point from '@/game/types/Point';
import { calcPieceSlotGlintPoint } from '@/book/pieces';

const GLINT_COLOR_RGB = '255, 255, 210';
const GLINT_RADIUS_IN_LINE_HEIGHTS = .25;
const GLINT_TRAIL_COUNT = 15;
const GLINT_TRAIL_RADIUS_REDUCTION = .7;
const GLINT_TRAIL_ANGLE_SPACING = Math.PI / 20; // Two degrees, expressed in radians.

export function splitTextToLines(text:string):string[] {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
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
  context.font = bookCanvasFont(fontSizePixels);
  context.textAlign = justification;
  context.textBaseline = 'top';
  context.fillText(text, x, y, maxWidth);
  context.restore();
}

/* v8 ignore next -- Glint appearance is verified visually. @preserve */
function _drawPieceSlotGlint(center:Point, polygon:readonly Point[], angle:number,
  radius:number, context:CanvasRenderingContext2D):void {
  // Calculate on the normal polygon; the caller's transform moves the entire result together.
  const [x, y] = calcPieceSlotGlintPoint(center, polygon, angle);
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${GLINT_COLOR_RGB}, 1)`);
  gradient.addColorStop(1, `rgba(${GLINT_COLOR_RGB}, 0)`);

  // Let the soft glow extend across the border without clipping to the slot.
  context.save();
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/* v8 ignore next -- Glint trail appearance is verified visually. @preserve */
function _drawPieceSlotGlintTrail(center:Point, polygon:readonly Point[], angle:number,
  lineHeight:number, context:CanvasRenderingContext2D):void {
  // Draw tail first, stepping clockwise behind the counterclockwise-moving head.
  let radius = lineHeight * GLINT_RADIUS_IN_LINE_HEIGHTS;
  for (let i = 0; i < GLINT_TRAIL_COUNT; ++i) {
    _drawPieceSlotGlint(center, polygon, angle - i * GLINT_TRAIL_ANGLE_SPACING, radius, context);
    radius *= GLINT_TRAIL_RADIUS_REDUCTION;
  }
}

/* v8 ignore next -- Piece slot drawing is verified visually. @preserve */
export function drawPagePieceSlot(text:string, x:number, y:number, width:number, lineHeight:number,
  padding:number, fontSizePixels:number, colorHex:string, pieceStyleNo:number, context:CanvasRenderingContext2D,
  backgroundColor:string | null = null, glintAngle:number|null = null):void {
  // Keep the flair within the existing padding so the text area stays unchanged.
  const rect = { x, y, width, height:lineHeight };
  const polygon = calcPieceBorderPolygon(rect,
    pieceStyleNo, Math.min(padding, width / 2));
  const fillColor = backgroundColor ?? (text === '' ? getPieceSlotColor(pieceStyleNo) : null);
  drawBorderedBookText(text, rect, polygon, padding, fontSizePixels, colorHex, fillColor, context);
  if (glintAngle !== null) _drawPieceSlotGlintTrail([x + width / 2, y + lineHeight / 2], polygon, glintAngle, lineHeight, context);
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