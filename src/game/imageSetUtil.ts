/* This module groups image-set creation and loading helpers for built-in and authored runtime image assets.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { getGroundImageAssetUrl, isCandidateUrls } from "./imageUrlUtil";
import { KEY_IMAGE_URL } from "./effects/lockEffectUtil";
import ClozeImage from "./solutions/types/ClozeImage";
import ClozePartType from "./solutions/types/ClozePartType";
import Level from "./types/Level";
import ImageSet from "./types/ImageSet";

export function createEmptyImageSet():ImageSet {
  return new Map<string, ImageBitmap>();
}

function _findDirectReferencedImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>([KEY_IMAGE_URL, getGroundImageAssetUrl()]);
  if (level.backgroundImageUrl) imageUrls.add(level.backgroundImageUrl);
  const sourceCharacters = level.initialCharacters.length ? level.initialCharacters : level.characters;
  sourceCharacters.forEach(character => {
    if (character.faceImageUrl) imageUrls.add(character.faceImageUrl);
  });
  level.solutions.forEach(solution => solution.parts.forEach(part => {
    if (part.type !== ClozePartType.image) return;
    const imageUrl = (part as ClozeImage).imageUrl;
    if (isCandidateUrls(imageUrl)) return;
    imageUrls.add(imageUrl);
  }));
  return [...imageUrls];
}

function _findResolvedCandidateUrl(candidateUrls:string[], imageSet:ImageSet):string|null {
  for (const candidateUrl of candidateUrls) {
    if (imageSet.has(candidateUrl)) return candidateUrl;
  }
  return null;
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

function _createLoadImageBitmapCache() {
  const imageBitmapPromisesByUrl = new Map<string, Promise<ImageBitmap|null>>();
  return (imageUrl:string) => {
    const existingPromise = imageBitmapPromisesByUrl.get(imageUrl);
    if (existingPromise) return existingPromise;
    const imageBitmapPromise = _loadImageBitmap(imageUrl);
    imageBitmapPromisesByUrl.set(imageUrl, imageBitmapPromise);
    return imageBitmapPromise;
  };
}

async function _loadDirectReferencedImages(level:Level, imageSet:ImageSet, loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>):Promise<void> {
  const imageUrls = _findDirectReferencedImageUrls(level);
  const imageEntries = await Promise.all(imageUrls.map(async imageUrl => [imageUrl, await loadImageBitmap(imageUrl)] as const));
  imageEntries.forEach(([imageUrl, imageBitmap]) => {
    if (imageBitmap) imageSet.set(imageUrl, imageBitmap);
  });
}

async function _resolveCandidateUrl(candidateUrls:string[], imageSet:ImageSet,
  loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>):Promise<string|null> {
  const resolvedImageUrl = _findResolvedCandidateUrl(candidateUrls, imageSet);
  if (resolvedImageUrl) return resolvedImageUrl;

  for (const candidateUrl of candidateUrls) {
    const imageBitmap = await loadImageBitmap(candidateUrl);
    if (!imageBitmap) continue;
    imageSet.set(candidateUrl, imageBitmap);
    return candidateUrl;
  }

  return null;
}

async function _resolveLevelSolutionImageUrls(level:Level, imageSet:ImageSet,
  loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>) {
  for (const solution of level.solutions) {
    for (const [partIndex, part] of solution.parts.entries()) {
      if (part.type !== ClozePartType.image) continue;
      const imagePart = part as ClozeImage;
      if (!isCandidateUrls(imagePart.imageUrl)) continue;
      const resolvedImageUrl = await _resolveCandidateUrl(imagePart.imageUrl, imageSet, loadImageBitmap);
      if (!resolvedImageUrl) continue;
      solution.parts[partIndex] = {
        ...imagePart,
        imageUrl:resolvedImageUrl
      };
    }
  }
}

export async function createImageSetFromLevel(level:Level):Promise<ImageSet> {
  const imageSet = createEmptyImageSet();
  const loadImageBitmap = _createLoadImageBitmapCache();
  await _loadDirectReferencedImages(level, imageSet, loadImageBitmap);
  await _resolveLevelSolutionImageUrls(level, imageSet, loadImageBitmap);
  return imageSet;
}