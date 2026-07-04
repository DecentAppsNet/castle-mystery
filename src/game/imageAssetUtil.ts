import ImageSet from "./types/ImageSet";
import ImageAsset from "./types/ImageAsset";

export function createImageAsset(image:ImageBitmap, punchMaskImage:ImageBitmap|null = null):ImageAsset {
  return { image, punchMaskImage };
}

export function findImageAsset(imageSet:ImageSet, imageUrl:string|null|undefined):ImageAsset|null {
  if (!imageUrl) return null;
  return imageSet.get(imageUrl) || null;
}

export function findImageBitmap(imageSet:ImageSet, imageUrl:string|null|undefined):ImageBitmap|null {
  return findImageAsset(imageSet, imageUrl)?.image || null;
}