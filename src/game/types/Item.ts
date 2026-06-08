import Position, { duplicatePosition } from "./Position";

type Item = {
  readonly id:string,
  readonly title:string,
  readonly displayChar:string,
  readonly imageUrl:string|null,
  readonly randomSalt:number,
  position:Position,
  drawOffset:Position,
  description:string,
  isDiscovered:boolean
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    displayChar:from.displayChar,
    imageUrl:from.imageUrl,
    randomSalt:from.randomSalt,
    position:duplicatePosition(from.position),
    drawOffset:duplicatePosition(from.drawOffset),
    description:from.description,
    isDiscovered:from.isDiscovered
  };
}

export default Item;