import Position, { duplicatePosition } from "./Position";

type Item = {
  id:string,
  title:string,
  displayChar:string,
  position:Position,
  description:string,
  isDiscovered:boolean
}

export function duplicateItem(from:Item):Item {
  return {
    id:from.id,
    title:from.title,
    displayChar:from.displayChar,
    position:duplicatePosition(from.position),
    description:from.description,
    isDiscovered:from.isDiscovered
  };
}

export default Item;