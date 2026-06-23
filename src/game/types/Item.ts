import Position, { duplicatePosition } from "./Position";

type Item = {
  readonly id:string,
  readonly title:string,
  readonly imageUrl:string|null,
  readonly randomSalt:number,
  isVisible:boolean,
  position:Position,
  drawOffset:Position,
  stackOffset:Position,
  description:string,
  isDiscovered:boolean
}

export function createDefaultItem():Item {
  return {
    id:'item',
    title:'Item',
    imageUrl:null,
    randomSalt:0,
    isVisible:true,
    position:{ x:0, y:0, z:0 },
    drawOffset:{ x:0, y:0, z:0 },
    stackOffset:{ x:0, y:0, z:0 },
    description:'',
    isDiscovered:false
  };
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    imageUrl:from.imageUrl,
    randomSalt:from.randomSalt,
    isVisible:from.isVisible,
    position:duplicatePosition(from.position),
    drawOffset:duplicatePosition(from.drawOffset),
    stackOffset:duplicatePosition(from.stackOffset),
    description:from.description,
    isDiscovered:from.isDiscovered
  };
}

export default Item;