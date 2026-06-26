import { ImageFilterId } from "@/game/imageFilters/imageFilterTypes";

type TextureModifier = Readonly<{
  type:'imageFilter',
  imageFilterId:ImageFilterId
}>;

export function duplicateTextureModifier(from:TextureModifier):TextureModifier {
  return { ...from };
}

export default TextureModifier;
