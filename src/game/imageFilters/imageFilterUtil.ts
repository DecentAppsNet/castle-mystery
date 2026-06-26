import TextureModifier from "@/game/types/TextureModifier";

import { applyAgedStoneImageFilter } from "./agedStoneImageFilter";
import { ImageFilterId } from "./imageFilterTypes";

export type ImageFilterArgs = Readonly<{
  context:CanvasRenderingContext2D,
  width:number,
  height:number,
  seed:number
}>;

type ImageFilter = (args:ImageFilterArgs) => void;

function _normalizeImageFilterId(text:string):string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function _findImageFilter(imageFilterId:ImageFilterId):ImageFilter {
  switch(imageFilterId) {
    case 'aged stone': return applyAgedStoneImageFilter;
  }
}

function _hashText(text:string):number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function _applyImageFilterModifier(context:CanvasRenderingContext2D, width:number, height:number,
  modifier:TextureModifier, seedText:string) {
  const imageFilter = _findImageFilter(modifier.imageFilterId);
  imageFilter({
    context,
    width,
    height,
    seed:_hashText(`${seedText}|${modifier.imageFilterId}`)
  });
}

export function findImageFilterId(text:string):ImageFilterId|null {
  const normalizedText = _normalizeImageFilterId(text);
  if (normalizedText === 'aged stone') return 'aged stone';
  return null;
}

export function applyTextureModifiers(context:CanvasRenderingContext2D, width:number, height:number,
  modifiers:Readonly<TextureModifier>[], seedText:string) {
  modifiers.forEach(modifier => _applyImageFilterModifier(context, width, height, modifier, seedText));
}
