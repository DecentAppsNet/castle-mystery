import Point from '@/game/types/Point';

type FlairProfile = {
  readonly borderPolygon:ReadonlyArray<Point>;
  readonly pieceColor:string;
  readonly pieceSlotColor:string;
};

export default FlairProfile;