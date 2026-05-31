export function getBackgroundImageAssetUrl(backgroundImageUrl:string):string {
  return `/backgrounds/${backgroundImageUrl}`;
}

export function getGroundImageAssetUrl():string {
  return getBackgroundImageAssetUrl('ground.png');
}