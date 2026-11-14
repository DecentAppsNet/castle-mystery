import Rect from '@/game/types/Rect';

type ImageAsset = Readonly<{
  image:ImageBitmap,
  punchMaskImage:ImageBitmap|null,
  visibleSourceRect:Rect|null
}>;

export default ImageAsset;