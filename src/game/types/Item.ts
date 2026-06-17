import Position, { duplicatePosition } from "./Position";

type Item = {
  readonly id:string,
  readonly title:string,
  readonly displayChar:string,
  readonly imageUrl:string|null,
  readonly randomSalt:number,
  isVisible:boolean,
  position:Position,
  drawOffset:Position,
  description:string,
  isDiscovered:boolean
}

export function createDefaultItem():Item {
  return {
    id:'item',
    title:'Item',
    displayChar:'?',
    imageUrl:null,
    randomSalt:0,
    isVisible:true,
    position:{ x:0, y:0, z:0 },
    drawOffset:{ x:0, y:0, z:0 },
    description:'',
    isDiscovered:false
  };
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    displayChar:from.displayChar,
    imageUrl:from.imageUrl,
    randomSalt:from.randomSalt,
    isVisible:from.isVisible,
    position:duplicatePosition(from.position),
    drawOffset:duplicatePosition(from.drawOffset),
    description:from.description,
    isDiscovered:from.isDiscovered
  };
}

export default Item;