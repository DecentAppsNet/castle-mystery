import Rect from "./Rect";

type Camera = {
  currentRect:Rect,
  targetRect:Rect,
  startRect:Rect,
  currentZoomAmount:number,
  startZoomAmount:number,
  trackedRoomId:string|null,
  aspectRatio:number,
  zoomAmount:number,
  moveStartTime:number,
  moveDuration:number,
  isMoving:boolean
}

export default Camera;