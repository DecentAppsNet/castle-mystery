import Rect from "./Rect";

type Obstruction = {
  rects:Rect[]
}

export function duplicateObstruction(from:Obstruction):Obstruction {
  return {
    rects:from.rects.map(rect => ({...rect}))
  };
}

export default Obstruction;