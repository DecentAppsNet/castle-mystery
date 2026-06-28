const MAX_TEXTURE_FACE_AXIS_PIXELS = 4096;
const MAX_TEXTURE_FACE_PIXELS = 8_388_608;

function _clampTextureFaceSize(width:number, height:number):{ width:number, height:number } {
  let clampedWidth = width;
  let clampedHeight = height;

  const axisScale = Math.min(
    1,
    MAX_TEXTURE_FACE_AXIS_PIXELS / clampedWidth,
    MAX_TEXTURE_FACE_AXIS_PIXELS / clampedHeight
  );
  clampedWidth = Math.max(1, Math.floor(clampedWidth * axisScale));
  clampedHeight = Math.max(1, Math.floor(clampedHeight * axisScale));

  const pixelCount = clampedWidth * clampedHeight;
  if (pixelCount <= MAX_TEXTURE_FACE_PIXELS) return { width:clampedWidth, height:clampedHeight };

  const pixelScale = Math.sqrt(MAX_TEXTURE_FACE_PIXELS / pixelCount);
  return {
    width:Math.max(1, Math.floor(clampedWidth * pixelScale)),
    height:Math.max(1, Math.floor(clampedHeight * pixelScale))
  };
}

export function calcTextureFaceSize(imageWidth:number, imageHeight:number,
  totalHorizontalCount:number, totalVerticalCount:number, textureHorizontalCount:number, textureVerticalCount:number):
  { width:number, height:number } {
  const width = Math.max(1, Math.round(imageWidth * (totalHorizontalCount / textureHorizontalCount)));
  const height = Math.max(1, Math.round(imageHeight * (totalVerticalCount / textureVerticalCount)));
  return _clampTextureFaceSize(width, height);
}