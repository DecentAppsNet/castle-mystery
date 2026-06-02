/* This module groups authored image-asset URL helpers and filename validation for game content.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export type CandidateUrls = string[];

const BACKGROUND_IMAGE_ASSET_BASE_URL = '/assets/backgrounds/';
const FACE_IMAGE_ASSET_BASE_URL = '/assets/faces/';
const SOLUTION_IMAGE_ASSET_BASE_URL = '/assets/solutions/';

function _containsNonFilenameAssetSyntax(assetFilename:string):boolean {
  return assetFilename.includes('/')
    || assetFilename.includes('\\')
    || assetFilename.includes('?')
    || assetFilename.includes('#')
    || assetFilename.includes(':')
    || assetFilename.includes('%')
    || assetFilename.includes('|');
}

function _validateAssetFilename(assetFilename:string, fieldName:string) {
  if (!assetFilename) throw new Error(`${fieldName} must be a filename`);
  if (_containsNonFilenameAssetSyntax(assetFilename)) {
    throw new Error(`${fieldName} must be a filename, not a path or URL`);
  }
}

export function isCandidateUrls(assetUrl:string|CandidateUrls):assetUrl is CandidateUrls {
  return Array.isArray(assetUrl);
}

export function getBackgroundImageAssetUrl(backgroundImageFilename:string):string {
  _validateAssetFilename(backgroundImageFilename, 'general background');
  return `${BACKGROUND_IMAGE_ASSET_BASE_URL}${backgroundImageFilename}`;
}

export function getFaceImageAssetUrl(faceImageFilename:string):string {
  _validateAssetFilename(faceImageFilename, 'character faceImage');
  return `${FACE_IMAGE_ASSET_BASE_URL}${faceImageFilename}`;
}

function _getSolutionImageAssetUrl(solutionImageFilename:string):string {
  _validateAssetFilename(solutionImageFilename, 'solution cloze image');
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