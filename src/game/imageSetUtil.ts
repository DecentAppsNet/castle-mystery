import { baseUrl } from "@/common/urlUtil";
import ClozeImage from "./solutions/types/ClozeImage";
import ClozePartType from "./solutions/types/ClozePartType";
import Level from "./types/Level";
import ImageSet from "./types/ImageSet";

export function createEmptyImageSet():ImageSet {
  return new Map<string, ImageBitmap>();
}

function _findReferencedImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>();
  const sourceCharacters = level.initialCharacters.length ? level.initialCharacters : level.characters;
  sourceCharacters.forEach(character => {
    if (character.faceImageUrl) imageUrls.add(character.faceImageUrl);
  });
  level.solutions.forEach(solution => solution.parts.forEach(part => {
    if (part.type === ClozePartType.image) imageUrls.add((part as ClozeImage).imageUrl);
  }));
  return [...imageUrls];
}

async function _loadImageBitmap(imageUrl:string):Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') throw new Error(`ImageBitmap is not supported for ${imageUrl}`);
  const response = await fetch(baseUrl(imageUrl));
  if (!response.ok) throw new Error(`unable to load face image ${imageUrl}`);
  return await createImageBitmap(await response.blob());
}

export async function createImageSetFromLevel(level:Level):Promise<ImageSet> {
  const imageSet = createEmptyImageSet();
  const imageUrls = _findReferencedImageUrls(level);
  const imageEntries = await Promise.all(imageUrls.map(async imageUrl => [imageUrl, await _loadImageBitmap(imageUrl)] as const));
  imageEntries.forEach(([imageUrl, imageBitmap]) => imageSet.set(imageUrl, imageBitmap));
  return imageSet;
}