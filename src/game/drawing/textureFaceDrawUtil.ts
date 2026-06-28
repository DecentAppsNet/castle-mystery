import { applyTextureModifiers } from "@/game/imageFilters/imageFilterUtil";
import { findTextureFilterOperations, findTexturePrimaryImageOperation } from "@/game/textureUtil";

import Texture from "../types/Texture";
import { createScratchCanvas } from "./canvasSurfaceUtil";

export type TextureFaceImage = Readonly<{
  image:CanvasImageSource,
  width:number,
  height:number
}>;

function _traceClosedPolygon(points:Array<[number, number]>, context:CanvasRenderingContext2D) {
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
}

export function drawClippedTransformedTextureFace(faceImage:TextureFaceImage, origin:[number, number],
  horizontalVector:[number, number], verticalVector:[number, number], points:Array<[number, number]>,
  context:CanvasRenderingContext2D, cutoutPoints:Array<Array<[number, number]>> = []) {
  context.save();
  context.beginPath();
  _traceClosedPolygon(points, context);
  cutoutPoints.forEach(cutout => _traceClosedPolygon(cutout, context));
  context.clip(cutoutPoints.length ? 'evenodd' : 'nonzero');
  context.transform(
    horizontalVector[0] / faceImage.width,
    horizontalVector[1] / faceImage.width,
    verticalVector[0] / faceImage.height,
    verticalVector[1] / faceImage.height,
    origin[0],
    origin[1]
  );
  context.drawImage(faceImage.image, 0, 0);
  context.restore();
}

function _createTextureLightnessFilter(textureLightness:number):string {
  return textureLightness === 1 ? 'none' : `brightness(${textureLightness})`;
}

function _calcFaceAxisPixelSize(imageAxisPixelSize:number, totalSpanCount:number, textureSpanCount:number):number {
  return Math.max(1, Math.round(imageAxisPixelSize * (totalSpanCount / textureSpanCount)));
}

export function createTiledTextureFaceCanvas(image:ImageBitmap, texture:Texture, totalHorizontalCount:number,
  totalVerticalCount:number, textureLightness:number, seedText:string):TextureFaceImage|null {
  if (totalHorizontalCount <= 0 || totalVerticalCount <= 0) return null;
  const textureImageOperation = findTexturePrimaryImageOperation(texture);
  if (!textureImageOperation) return null;
  const textureFilterOperations = findTextureFilterOperations(texture);

  const faceWidth = _calcFaceAxisPixelSize(image.width, totalHorizontalCount, textureImageOperation.horizontalCount);
  const faceHeight = _calcFaceAxisPixelSize(image.height, totalVerticalCount, textureImageOperation.verticalCount);
  const faceCanvas = createScratchCanvas(faceWidth, faceHeight);
  if (!faceCanvas) return null;
  const faceContext = faceCanvas.getContext('2d');
  if (!faceContext) return null;

  const tileWidth = faceWidth * (textureImageOperation.horizontalCount / totalHorizontalCount);
  const tileHeight = faceHeight * (textureImageOperation.verticalCount / totalVerticalCount);
  if (tileWidth <= 0 || tileHeight <= 0) return null;

  faceContext.save();
  faceContext.filter = _createTextureLightnessFilter(textureLightness);
  for (let drawY = 0; drawY < faceHeight; drawY += tileHeight) {
    for (let drawX = 0; drawX < faceWidth; drawX += tileWidth) {
      faceContext.drawImage(image, drawX, drawY, tileWidth, tileHeight);
    }
  }
  faceContext.restore();

  if (textureFilterOperations.length > 0) {
    applyTextureModifiers(faceContext as unknown as CanvasRenderingContext2D, faceWidth, faceHeight, textureFilterOperations, seedText);
  }

  return {
    image:faceCanvas,
    width:faceWidth,
    height:faceHeight
  };
}
