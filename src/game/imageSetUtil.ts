/* This module groups image-set creation and loading helpers for built-in and authored runtime image assets.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { getGroundImageAssetUrl, isCandidateUrls } from "./imageUrlUtil";
import { UNKNOWN_ITEM_ICON_URL } from "./discoveryIconUrlUtil";
import { findTextureImageUrls } from "./textureUtil";
import ClozeImage from "./conclusions/types/ClozeImage";
import ClozePartType from "./conclusions/types/ClozePartType";
import Level from "./types/Level";
import { ImageSet } from "@/imageLoading";
import { assertNonNullable } from "decent-portal";
import { KEY_IMAGE_URL } from "./effects/lockEffectUtil";
import { CHARACTER_SELECTION_NIMBUS_IMAGE_URL } from "./effects/characterSelectionEffectUtil";
import BodyPart from './characterBody/types/BodyPart';
import { BOOK_ICON_IMAGE_URL } from "./drawing/overlay";
import { BOOK_IMAGE_URL, BOOK_PAGE_TILE_IMAGE_URL, ILLUMINATIONS_IMAGE_URL } from "@/book";

function _findItemImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>();
  const itemIds = level.itemsById.keys();
  itemIds.forEach(itemId => {
    const item = level.itemsById.get(itemId);
    assertNonNullable(item);
    if (item.imageUrl) imageUrls.add(item.imageUrl);
  });
  return [...imageUrls];
}

function _collectBodyImageUrls(part:BodyPart, imageUrls:Set<string>):void {
  if (part.imageUrl !== null) imageUrls.add(part.imageUrl);
  part.connectedParts.forEach(connection => _collectBodyImageUrls(connection.part, imageUrls));
}

function _findCharacterImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>();
  level.characters.forEach(character => {
    _collectBodyImageUrls(character.rootBodyPart, imageUrls);
    character.skins.forEach(skin => {
      if (skin.headImageUrl) imageUrls.add(skin.headImageUrl);
    });
  });
  return [...imageUrls];
}

function _createPermanentImageUrls():ReadonlySet<string> {
  return new Set([
    CHARACTER_SELECTION_NIMBUS_IMAGE_URL,
    KEY_IMAGE_URL,
    getGroundImageAssetUrl(),
    UNKNOWN_ITEM_ICON_URL,
    BOOK_ICON_IMAGE_URL,
    BOOK_IMAGE_URL,
    BOOK_PAGE_TILE_IMAGE_URL,
    ILLUMINATIONS_IMAGE_URL
  ]);
}

function _findLevelImageUrls(level:Level):string[] {
  const imageUrls = new Set<string>();
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
  _findItemImageUrls(level).forEach(imageUrl => imageUrls.add(imageUrl));
  _findCharacterImageUrls(level).forEach(imageUrl => imageUrls.add(imageUrl));
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
    if (imageSet.findImage(candidateUrl)) return candidateUrl;
  }
  return null;
}

async function _loadDirectReferencedImages(level:Level, imageSet:ImageSet):Promise<void> {
  const imageUrls = _findLevelImageUrls(level).filter(imageUrl => !imageSet.findImage(imageUrl));
  await Promise.all(imageUrls.map(imageUrl => imageSet.loadImage(imageUrl, true)));
}

async function _resolveCandidateUrl(candidateUrls:string[], imageSet:ImageSet):Promise<string> {
  const resolvedImageUrl = _findResolvedCandidateUrl(candidateUrls, imageSet);
  if (resolvedImageUrl) return resolvedImageUrl;

  // Candidate failures are expected while probing ordered alternative buckets.
  let lastError:unknown = null;
  for (const candidateUrl of candidateUrls) {
    try {
      await imageSet.loadImage(candidateUrl, true);
      return candidateUrl;
    } catch (error) {
      lastError = error;
    }
  }

  // Do not publish unresolved images after all permitted candidates fail.
  throw new Error(`Could not load conclusion image candidates: ${candidateUrls.join(', ')}`, { cause:lastError });
}

async function _resolveLevelConclusionImageUrls(level:Level, imageSet:ImageSet) {
  for (const conclusion of level.conclusions) {
    for (const [partIndex, part] of conclusion.parts.entries()) {
      if (part.type !== ClozePartType.image) continue;
      const imagePart = part as ClozeImage;
      if (!isCandidateUrls(imagePart.imageUrl)) continue;
      const resolvedImageUrl = await _resolveCandidateUrl(imagePart.imageUrl, imageSet);
      conclusion.parts[partIndex] = {
        ...imagePart,
        imageUrl:resolvedImageUrl
      };
    }
  }
}

export async function createImageSet():Promise<ImageSet> {
  const imageSet = new ImageSet();
  const imageUrls = [..._createPermanentImageUrls()];
  const loadingImages = imageUrls.map(imageUrl => imageSet.loadImage(imageUrl, true));
  await Promise.all(loadingImages);
  return imageSet;
}

export async function updateImageSetForLevel(level:Level, imageSet:ImageSet):Promise<void> {
  await _loadDirectReferencedImages(level, imageSet);
  await _resolveLevelConclusionImageUrls(level, imageSet);
}