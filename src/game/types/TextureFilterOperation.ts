import { ImageFilterId } from "@/game/imageFilters/imageFilterTypes";

type TextureFilterOperation = Readonly<{
  type:'imageFilter',
  imageFilterId:ImageFilterId
}>;

export default TextureFilterOperation;