import Position, { duplicatePosition } from "./Position";

type Item = {
  readonly id:string,
  readonly title:string,
  readonly displayChar:string,
  readonly randomSalt:number,
  position:Position,
  description:string,
  isDiscovered:boolean
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    displayChar:from.displayChar,
    randomSalt:from.randomSalt,
    position:duplicatePosition(from.position),
    description:from.description,
    isDiscovered:from.isDiscovered
  };
}

export default Item;