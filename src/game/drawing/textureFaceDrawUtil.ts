import { applyTextureModifiers } from "@/game/imageFilters/imageFilterUtil";

import Texture from "../types/Texture";
import { createScratchCanvas } from "./canvasSurfaceUtil";

export type TextureFaceImage = Readonly<{
  image:CanvasImageSource,
  width:number,
  height:number
}>;

function _createTextureLightnessFilter(textureLightness:number):string {
  return textureLightness === 1 ? 'none' : `brightness(${textureLightness})`;
}

function _calcFaceAxisPixelSize(imageAxisPixelSize:number, totalSpanCount:number, textureSpanCount:number):number {
  return Math.max(1, Math.round(imageAxisPixelSize * (totalSpanCount / textureSpanCount)));
}

export function createTiledTextureFaceCanvas(image:ImageBitmap, texture:Texture, totalHorizontalCount:number,
  totalVerticalCount:number, textureLightness:number, seedText:string):TextureFaceImage|null {
  if (totalHorizontalCount <= 0 || totalVerticalCount <= 0) return null;

  const faceWidth = _calcFaceAxisPixelSize(image.width, totalHorizontalCount, texture.horizontalCount);
  const faceHeight = _calcFaceAxisPixelSize(image.height, totalVerticalCount, texture.verticalCount);
  const faceCanvas = createScratchCanvas(faceWidth, faceHeight);
  if (!faceCanvas) return null;
  const faceContext = faceCanvas.getContext('2d');
  if (!faceContext) return null;

  const tileWidth = faceWidth * (texture.horizontalCount / totalHorizontalCount);
  const tileHeight = faceHeight * (texture.verticalCount / totalVerticalCount);
  if (tileWidth <= 0 || tileHeight <= 0) return null;

  faceContext.save();
  faceContext.filter = _createTextureLightnessFilter(textureLightness);
  for (let drawY = 0; drawY < faceHeight; drawY += tileHeight) {
    for (let drawX = 0; drawX < faceWidth; drawX += tileWidth) {
      faceContext.drawImage(image, drawX, drawY, tileWidth, tileHeight);
    }
  }
  faceContext.restore();

  if (texture.modifiers.length > 0) {
    applyTextureModifiers(faceContext as unknown as CanvasRenderingContext2D, faceWidth, faceHeight, texture.modifiers, seedText);
  }

  return {
    image:faceCanvas,
    width:faceWidth,
    height:faceHeight
  };
}
