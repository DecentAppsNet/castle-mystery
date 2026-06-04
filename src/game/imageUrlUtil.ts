/* This module groups authored image-asset URL helpers and filename validation for game content.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { validateFilename } from "@/common/filenameValidationUtil";

export type CandidateUrls = string[];

const BACKGROUND_IMAGE_ASSET_BASE_URL = '/assets/backgrounds/';
const FACE_IMAGE_ASSET_BASE_URL = '/assets/faces/';
const SOLUTION_IMAGE_ASSET_BASE_URL = '/assets/solutions/';

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

function _getSolutionImageAssetUrl(solutionImageFilename:string):string {
  validateFilename(solutionImageFilename, 'solution cloze image');
  return `${SOLUTION_IMAGE_ASSET_BASE_URL}${solutionImageFilename}`;
}

export function getClozeImageCandidateUrls(solutionImageFilename:string):CandidateUrls {
  return [
    _getSolutionImageAssetUrl(solutionImageFilename),
    getFaceImageAssetUrl(solutionImageFilename)
  ];
}

export function getGroundImageAssetUrl():string {
  return '/assets/backgrounds/ground.png';
}