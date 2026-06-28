import TextureAlphaMode from "./TextureAlphaMode";

type TextureImageOperation = Readonly<{
  type:'image',
  imageUrl:string,
  horizontalCount:number, // Count of world-space units that source image spans horizontally when tiling.
  verticalCount:number, // Count of world-space units that source image spans vertically when tiling.
  alphaMode:TextureAlphaMode
}>;

export default TextureImageOperation;