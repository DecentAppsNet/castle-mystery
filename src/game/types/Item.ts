import Position, { duplicatePosition } from "./Position";

type Item = {
  readonly id:string,
  readonly title:string,
  readonly displayChar:string,
  position:Position,
  description:string,
  isDiscovered:boolean,
  isExamined:boolean
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    displayChar:from.displayChar,
    position:duplicatePosition(from.position),
    description:from.description,
    isDiscovered:from.isDiscovered,
    isExamined:from.isExamined
  };
}

export default Item;