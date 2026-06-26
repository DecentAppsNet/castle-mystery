import TextureModifier, { duplicateTextureModifier } from "./TextureModifier"

type Texture = Readonly<{
  imageUrl:string,
  horizontalCount:number, // Count of world-space units that source image spans horizontally when tiling.
  verticalCount:number, // Count of world-space units that source image spans vertically when tiling.
  modifiers:Readonly<TextureModifier>[]
}>;

export function duplicateTexture(from:Texture):Texture {
  return {
    imageUrl:from.imageUrl,
    horizontalCount:from.horizontalCount,
    verticalCount:from.verticalCount,
    modifiers:from.modifiers.map(duplicateTextureModifier)
  };
}

export default Texture;