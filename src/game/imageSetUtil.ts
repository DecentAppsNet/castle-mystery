/* This module groups image-set creation and loading helpers for built-in and authored runtime image assets.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { getGroundImageAssetUrl, isCandidateUrls } from "./imageUrlUtil";
import { KEY_IMAGE_URL } from "./effects/lockEffectUtil";
import { UNKNOWN_ITEM_ICON_URL } from "./discoveryIconUrlUtil";
import { createImageAsset } from "./imageAssetUtil";
import { findTextureImageUrls } from "./textureUtil";
import ClozeImage from "./conclusions/types/ClozeImage";
import ClozePartType from "./conclusions/types/ClozePartType";
import Level from "./types/Level";
import ImageSet from "./types/ImageSet";
import { endTiming, startTiming } from "@/common/timingPerformanceUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import BecomesItemEvent from "./types/itineraryEvents/BecomesItemEvent";

export function createEmptyImageSet():ImageSet {
  return new Map();
}

function _findPunchMaskImageUrl(imageUrl:string):string|null {
  if (!imageUrl.toLowerCase().endsWith('.png')) return null;
  return imageUrl.slice(0, -4) + '.punch.png';
}

function _findBecomesTargetImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>();
  const sourceCharacters = level.initialCharacters.length ? level.initialCharacters : level.characters;
  sourceCharacters.forEach(character => character.itinerary.forEach(event => {
    if (event.type !== ItineraryEventType.BECOMES_ITEM) return;
    const targetItem = level.itemsById.get((event as BecomesItemEvent).targetItemId) || null;
    if (targetItem?.imageUrl) imageUrls.add(targetItem.imageUrl);
  }));
  return [...imageUrls];
}

function _findDirectReferencedImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>([KEY_IMAGE_URL, getGroundImageAssetUrl(), UNKNOWN_ITEM_ICON_URL]);
  if (level.backgroundImageUrl) imageUrls.add(level.backgroundImageUrl);
  level.rooms.forEach(room => {
    room.backWallTexture && findTextureImageUrls(room.backWallTexture).forEach(imageUrl => imageUrls.add(imageUrl));
    room.floorTexture && findTextureImageUrls(room.floorTexture).forEach(imageUrl => imageUrls.add(imageUrl));
    room.stairTexture && findTextureImageUrls(room.stairTexture).forEach(imageUrl => imageUrls.add(imageUrl));
    room.doorTexture && findTextureImageUrls(room.doorTexture).forEach(imageUrl => imageUrls.add(imageUrl));
    room.rightWallTexture && findTextureImageUrls(room.rightWallTexture).forEach(imageUrl => imageUrls.add(imageUrl));
  });
  level.rooms.forEach(room => room.items.forEach(item => {
    if (item.imageUrl) imageUrls.add(item.imageUrl);
  }));
  _findBecomesTargetImageUrls(level).forEach(imageUrl => imageUrls.add(imageUrl));
  const sourceCharacters = level.initialCharacters.length ? level.initialCharacters : level.characters;
  sourceCharacters.forEach(character => {
    if (character.faceImageUrl) imageUrls.add(character.faceImageUrl);
    character.items.forEach(item => {
      if (item.imageUrl) imageUrls.add(item.imageUrl);
    });
    if (character.leftHandItem?.imageUrl) imageUrls.add(character.leftHandItem.imageUrl);
    if (character.rightHandItem?.imageUrl) imageUrls.add(character.rightHandItem.imageUrl);
  });
  level.conclusions.forEach(conclusion => conclusion.parts.forEach(part => {
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
  try {
    const response = await fetch(baseUrl(imageUrl));
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

async function _loadOptionalPunchMaskImageBitmap(imageUrl:string):Promise<ImageBitmap|null> {
  const punchMaskImageUrl = _findPunchMaskImageUrl(imageUrl);
  if (!punchMaskImageUrl) return null;
  try {
    const response = await fetch(baseUrl(punchMaskImageUrl));
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) return null;
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

function _createLoadPunchMaskImageBitmapCache() {
  const imageBitmapPromisesByUrl = new Map<string, Promise<ImageBitmap|null>>();
  return (imageUrl:string) => {
    const existingPromise = imageBitmapPromisesByUrl.get(imageUrl);
    if (existingPromise) return existingPromise;
    const imageBitmapPromise = _loadOptionalPunchMaskImageBitmap(imageUrl);
    imageBitmapPromisesByUrl.set(imageUrl, imageBitmapPromise);
    return imageBitmapPromise;
  };
}

async function _loadDirectReferencedImages(level:Level, imageSet:ImageSet,
  loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>,
  loadPunchMaskImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>):Promise<void> {
  const imageUrls = _findDirectReferencedImageUrls(level);
  const imageEntries = await Promise.all(imageUrls.map(async imageUrl => {
    const imageBitmap = await loadImageBitmap(imageUrl);
    const punchMaskImage = imageBitmap ? await loadPunchMaskImageBitmap(imageUrl) : null;
    return [imageUrl, imageBitmap, punchMaskImage] as const;
  }));
  imageEntries.forEach(([imageUrl, imageBitmap, punchMaskImage]) => {
    if (imageBitmap) imageSet.set(imageUrl, createImageAsset(imageBitmap, punchMaskImage));
  });
}

async function _resolveCandidateUrl(candidateUrls:string[], imageSet:ImageSet,
  loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>,
  loadPunchMaskImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>):Promise<string|null> {
  const resolvedImageUrl = _findResolvedCandidateUrl(candidateUrls, imageSet);
  if (resolvedImageUrl) return resolvedImageUrl;

  for (const candidateUrl of candidateUrls) {
    const imageBitmap = await loadImageBitmap(candidateUrl);
    if (!imageBitmap) continue;
    imageSet.set(candidateUrl, createImageAsset(imageBitmap, await loadPunchMaskImageBitmap(candidateUrl)));
    return candidateUrl;
  }

  return null;
}

async function _resolveLevelConclusionImageUrls(level:Level, imageSet:ImageSet,
  loadImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>,
  loadPunchMaskImageBitmap:(imageUrl:string) => Promise<ImageBitmap|null>) {
  for (const conclusion of level.conclusions) {
    for (const [partIndex, part] of conclusion.parts.entries()) {
      if (part.type !== ClozePartType.image) continue;
      const imagePart = part as ClozeImage;
      if (!isCandidateUrls(imagePart.imageUrl)) continue;
      const resolvedImageUrl = await _resolveCandidateUrl(imagePart.imageUrl, imageSet, loadImageBitmap, loadPunchMaskImageBitmap);
      if (!resolvedImageUrl) continue;
      conclusion.parts[partIndex] = {
        ...imagePart,
        imageUrl:resolvedImageUrl
      };
    }
  }
}

export async function createImageSetFromLevel(level:Level):Promise<ImageSet> {
  const imageLoadTiming = `image loading (${level.activeCharacterId}, ${level.rooms.length} rooms)`;
  const directImageTiming = `image loading direct references (${level.activeCharacterId}, ${level.rooms.length} rooms)`;
  const candidateImageTiming = `image loading candidate resolution (${level.activeCharacterId}, ${level.rooms.length} rooms)`;
  startTiming(imageLoadTiming);
  const imageSet = createEmptyImageSet();
  const loadImageBitmap = _createLoadImageBitmapCache();
  const loadPunchMaskImageBitmap = _createLoadPunchMaskImageBitmapCache();
  try {
    startTiming(directImageTiming);
    await _loadDirectReferencedImages(level, imageSet, loadImageBitmap, loadPunchMaskImageBitmap);
    endTiming(directImageTiming);
    startTiming(candidateImageTiming);
    await _resolveLevelConclusionImageUrls(level, imageSet, loadImageBitmap, loadPunchMaskImageBitmap);
    endTiming(candidateImageTiming);
    return imageSet;
  } finally {
    endTiming(imageLoadTiming);
  }
}