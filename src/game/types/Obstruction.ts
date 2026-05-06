import Rect from "./Rect";

type Obstruction = {
  rect:Rect
}

export function duplicateObstruction(from:Obstruction):Obstruction {
  return {
    rect:{...from.rect}
  };
}

export default Obstruction;