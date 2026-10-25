import Point from '@/game/types/Point';

/** Validated source-pixel dimensions and pivot for one resolved raster image URL. */
type RasterPartGeometry = {
  readonly imageUrl:string,
  readonly width:number,
  readonly height:number,
  readonly pivotPoint:Point
};

export default RasterPartGeometry;