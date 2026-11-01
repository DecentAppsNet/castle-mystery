/* This file paints visually resolved character heads with shared image fitting.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { fitHeadImage, getBodyBounds, transformBodyPoint } from '@/game/characterBody';
import ResolvedBodyPart from '@/game/characterBody/types/ResolvedBodyPart';
import Character from '@/game/types/Character';
import ImageSet from '@/game/types/ImageSet';
import { findImageBitmap } from '@/game/imageAssetUtil';
import { COLOR_BLACK } from '../drawColorConstants';

/** Paints a canvas-resolved head without altering base anatomy or deciding part order; lineWidth is canvas pixels. */
export function drawCharacterHead(head:ResolvedBodyPart, character:Character, imageSet:ImageSet,
  lineWidth:number, context:CanvasRenderingContext2D) {
  const image = findImageBitmap(imageSet, head.part.imageUrl);
  const fit = image ? fitHeadImage(head.part, image.width, image.height, character.rootBodyPart.imageUrl !== null) : null;
  context.save();
  if (image && fit) {
    const { transform } = head;
    context.transform(transform.horizontalX, transform.horizontalY, transform.verticalX,
      transform.verticalY, transform.translateX, transform.translateY);
    context.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  } else {
    const [centerX, centerY] = transformBodyPoint(head.transform, [head.part.width / 2, head.part.height / 2]);
    const bounds = getBodyBounds([head]);
    context.lineWidth = lineWidth;
    context.strokeStyle = COLOR_BLACK;
    context.beginPath();
    context.arc(centerX, centerY, Math.max(bounds.width, bounds.height) / 2, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}