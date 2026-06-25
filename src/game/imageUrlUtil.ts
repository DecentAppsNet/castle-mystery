/* This module groups authored image-asset URL helpers and filename validation for game content.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { validateFilename } from "@/common/filenameValidationUtil";

export type CandidateUrls = string[];

const BACKGROUND_IMAGE_ASSET_BASE_URL = '/assets/backgrounds/';
const FACE_IMAGE_ASSET_BASE_URL = '/assets/faces/';
const ITEM_IMAGE_ASSET_BASE_URL = '/assets/items/';
const ROOM_TEXTURE_ASSET_BASE_URL = '/assets/room/';
const CONCLUSION_IMAGE_ASSET_BASE_URL = '/assets/conclusions/';

export function isCandidateUrls(assetUrl:string|CandidateUrls):assetUrl is CandidateUrls {
  return Array.isArray(assetUrl);
}

export function getBackgroundImageAssetUrl(backgroundImageFilename:string):string {
  validateFilename(backgroundImageFilename, 'general background');
  return `${BACKGROUND_IMAGE_ASSET_BASE_URL}${backgroundImageFilename}`;
}

export function getFaceImageAssetUrl(faceImageFilename:string):string {
  validateFilename(faceImageFilename, 'character faceImage');
  return `${FACE_IMAGE_ASSET_BASE_URL}${faceImageFilename}`;
}

export function getItemImageAssetUrl(itemImageFilename:string):string {
  validateFilename(itemImageFilename, 'item image');
  return `${ITEM_IMAGE_ASSET_BASE_URL}${itemImageFilename}`;
}

export function getRoomTextureAssetUrl(roomTextureFilename:string, fieldName:string = 'room texture'):string {
  validateFilename(roomTextureFilename, fieldName);
  return `${ROOM_TEXTURE_ASSET_BASE_URL}${roomTextureFilename}`;
}

function _getConclusionImageAssetUrl(conclusionImageFilename:string):string {
  validateFilename(conclusionImageFilename, 'conclusion cloze image');
  return `${CONCLUSION_IMAGE_ASSET_BASE_URL}${conclusionImageFilename}`;
}

export function getClozeImageCandidateUrls(conclusionImageFilename:string):CandidateUrls {
  return [
    _getConclusionImageAssetUrl(conclusionImageFilename),
    getFaceImageAssetUrl(conclusionImageFilename)
  ];
}

export function getGroundImageAssetUrl():string {
  return '/assets/backgrounds/ground.png';
}