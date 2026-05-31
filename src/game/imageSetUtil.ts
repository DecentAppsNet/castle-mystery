import { baseUrl } from "@/common/urlUtil";
import { getBackgroundImageAssetUrl, getGroundImageAssetUrl } from "./imageUrlUtil";
import { KEY_IMAGE_URL } from "./effects/lockEffectUtil";
import ClozeImage from "./solutions/types/ClozeImage";
import ClozePartType from "./solutions/types/ClozePartType";
import Level from "./types/Level";
import ImageSet from "./types/ImageSet";

export function createEmptyImageSet():ImageSet {
  return new Map<string, ImageBitmap>();
}

function _findReferencedImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>([KEY_IMAGE_URL, getGroundImageAssetUrl()]);
  if (level.backgroundImageUrl) imageUrls.add(getBackgroundImageAssetUrl(level.backgroundImageUrl));
  const sourceCharacters = level.initialCharacters.length ? level.initialCharacters : level.characters;
  sourceCharacters.forEach(character => {
    if (character.faceImageUrl) imageUrls.add(character.faceImageUrl);
  });
  level.solutions.forEach(solution => solution.parts.forEach(part => {
    if (part.type === ClozePartType.image) imageUrls.add((part as ClozeImage).imageUrl);
  }));
  return [...imageUrls];
}

async function _loadImageBitmap(imageUrl:string):Promise<ImageBitmap|null> {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const response = await fetch(baseUrl(imageUrl));
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

export async function createImageSetFromLevel(level:Level):Promise<ImageSet> {
  const imageSet = createEmptyImageSet();
  const imageUrls = _findReferencedImageUrls(level);
  const imageEntries = await Promise.all(imageUrls.map(async imageUrl => [imageUrl, await _loadImageBitmap(imageUrl)] as const));
  imageEntries.forEach(([imageUrl, imageBitmap]) => {
    if (imageBitmap) imageSet.set(imageUrl, imageBitmap);
  });
  return imageSet;
}