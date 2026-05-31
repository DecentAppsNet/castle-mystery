const BACKGROUND_IMAGE_ASSET_BASE_URL = '/assets/backgrounds/';
const FACE_IMAGE_ASSET_BASE_URL = '/assets/faces/';

function _containsNonFilenameAssetSyntax(assetFilename:string):boolean {
  return assetFilename.includes('/')
    || assetFilename.includes('\\')
    || assetFilename.includes('?')
    || assetFilename.includes('#')
    || assetFilename.includes(':')
    || assetFilename.includes('%')
    || assetFilename.includes('|');
}

function _assertIsAssetFilename(assetFilename:string, fieldName:string) {
  if (!assetFilename) throw new Error(`${fieldName} must be a filename`);
  if (_containsNonFilenameAssetSyntax(assetFilename)) {
    throw new Error(`${fieldName} must be a filename, not a path or URL`);
  }
}

export function getBackgroundImageAssetUrl(backgroundImageFilename:string):string {
  _assertIsAssetFilename(backgroundImageFilename, 'general background');
  return `${BACKGROUND_IMAGE_ASSET_BASE_URL}${backgroundImageFilename}`;
}

export function getFaceImageAssetUrl(faceImageFilename:string):string {
  _assertIsAssetFilename(faceImageFilename, 'character faceImage');
  return `${FACE_IMAGE_ASSET_BASE_URL}${faceImageFilename}`;
}

export function getGroundImageAssetUrl():string {
  return '/assets/backgrounds/ground.png';
}