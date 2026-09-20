import { assert } from "decent-portal";

import Position, { arePositionsEqual, duplicatePosition } from "./Position";

export type MutableItem = {
  readonly id:string,
  readonly title:string,
  readonly imageUrl:string|null,
  readonly randomSalt:number,
  readonly description:string,
  readonly stackOffset:Position,
  isVisible:boolean,
  position:Position,
  drawOffset:Position
};

type Item = Readonly<MutableItem>;

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
    description:''
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
    description:from.description
  };
}

export function areItemsEqual(a:Item, b:Item):boolean {
  assert(a.id !== b.id || (a.title === b.title && a.imageUrl === b.imageUrl && arePositionsEqual(a.stackOffset, b.stackOffset) &&
    a.randomSalt === b.randomSalt && a.description === b.description)); // Should never create another instance with same ID and different read-only members.
  if (a === b) return true;
  return (a.id === b.id && a.isVisible === b.isVisible && arePositionsEqual(a.position, b.position) && arePositionsEqual(a.drawOffset, b.drawOffset));
}

export default Item;