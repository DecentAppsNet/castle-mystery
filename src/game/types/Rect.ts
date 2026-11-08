type Rect = {
  x:number, 
  y:number,
  width:number,
  height:number
}

export function createDefaultRect():Rect {
  return { x:0, y:0, width:0, height:0 };
}

export default Rect;