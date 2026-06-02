/* This module groups the item model and its duplication helper for runtime state copies.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

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