type Texture = Readonly<{
  imageUrl:string,
  horizontalCount:number, // Count of world-space units that source image spans horizontally when tiling.
  verticalCount:number // Count of world-space units that source image spans vertically when tiling.
}>;

export function duplicateTexture(from:Texture):Texture {
  return {
    imageUrl:from.imageUrl,
    horizontalCount:from.horizontalCount,
    verticalCount:from.verticalCount
  };
}

export default Texture;