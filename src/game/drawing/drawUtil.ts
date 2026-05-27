/* This module groups shared coordinate conversion and scaling helpers for game drawing. */

import ScalingFactors from "../types/ScalingFactors";
import Rect from "../types/Rect";

const ROOM_FONT_HEIGHT_RATIO = 0.02; // Font height as a ratio of the canvas height.
const ROOM_LINE_WIDTH = 0.005;

export const ZERO_SCALING_FACTORS:ScalingFactors = {
  sourceX:0,
  sourceY:0,
  sourceWidth:0,
  sourceHeight:0,
  scaleX:0,
  translateX:0,
  scaleY:0,
  translateY:0,
  roomFontHeight:0,
  roomLineWidth:0,
  destWidth:0,
  destHeight:0
}

export function gameToCanvasPosition(x:number, y:number, scalingFactors:ScalingFactors):[x:number, y:number] {
  return [x * scalingFactors.scaleX + scalingFactors.translateX, y * scalingFactors.scaleY + scalingFactors.translateY];
}

export function canvasToGamePosition(x:number, y:number, scalingFactors:ScalingFactors):[x:number, y:number] {
  if (!scalingFactors || scalingFactors.scaleX === 0 || scalingFactors.scaleY === 0) return [x, y];
  return [(x - scalingFactors.translateX) / scalingFactors.scaleX, (y - scalingFactors.translateY) / scalingFactors.scaleY];
}

// Calculate scaling factors that will translate a rect of sourceWidth and sourceHeight dimensions so that
// it will fit centered insides of a rect of destWidth and destHeight, while maintaining the original aspect
// ratio of the source rect.
export function calcScalingFactors(sourceWidth:number, sourceHeight:number, destWidth:number, destHeight:number):ScalingFactors {
  return calcScalingFactorsForRect({ x:0, y:0, width:sourceWidth, height:sourceHeight }, destWidth, destHeight);
}

export function calcScalingFactorsForRect(sourceRect:Rect, destWidth:number, destHeight:number):ScalingFactors {
  const { x:sourceX, y:sourceY, width:sourceWidth, height:sourceHeight } = sourceRect;
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    return ZERO_SCALING_FACTORS;
  }
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const destAspectRatio = destWidth / destHeight;
  let scaleX, translateX, scaleY, translateY;
  if (sourceAspectRatio > destAspectRatio) {
    scaleX = scaleY = destWidth / sourceWidth;
    translateX = -sourceX * scaleX;
    translateY = (destHeight - sourceHeight * scaleY) / 2;
  } else {
    scaleX = scaleY = destHeight / sourceHeight;
    translateX = (destWidth - sourceWidth * scaleX) / 2;
    translateY = -sourceY * scaleY;
  }
  translateX += sourceAspectRatio > destAspectRatio ? 0 : -sourceX * scaleX;
  translateY += sourceAspectRatio > destAspectRatio ? -sourceY * scaleY : 0;
  const roomFontHeight = Math.round(destHeight * ROOM_FONT_HEIGHT_RATIO);
  const roomLineWidth = Math.max(1, destHeight * ROOM_LINE_WIDTH);
  return { sourceX, sourceY, sourceWidth, sourceHeight, scaleX, translateX, scaleY, translateY, roomFontHeight, roomLineWidth, destWidth, destHeight };
}
