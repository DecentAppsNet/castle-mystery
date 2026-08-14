import Item, { duplicateItem } from "./Item";
import Position, { createDefaultPosition, duplicatePosition } from "./Position";

export type FacingDirection = 'left' | 'right';
export const VALID_FACING_DIRECTIONS:FacingDirection[] = ['left', 'right'];
export const DEFAULT_FACING_DIRECTION:FacingDirection = 'right';
export type BodyOrientation = 'standing' | 'sitting' | 'kneeling' | 'laying';
export const VALID_BODY_ORIENTATIONS:BodyOrientation[] = ['standing', 'sitting', 'kneeling', 'laying'];
export const DEFAULT_BODY_ORIENTATION:BodyOrientation = 'standing';

type Character = {
  readonly id:string,
  readonly title:string,
  readonly faceImageUrl:string|null,
  readonly randomSalt:number,
  isVisible:boolean,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  description:string,
  items:Item[],
  leftHandItem:Item|null,
  rightHandItem:Item|null,
  position:Position
}

export function createDefaultCharacter():Character {
  return {
    id:'character',
    title:'Character',
    faceImageUrl:null,
    randomSalt:0,
    isVisible:true,
    facingDirection:DEFAULT_FACING_DIRECTION,
    bodyOrientation:DEFAULT_BODY_ORIENTATION,
    description:'',
    items:[],
    leftHandItem:null,
    rightHandItem:null,
    position:createDefaultPosition(),
  };
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    title:from.title,
    faceImageUrl:from.faceImageUrl,
    randomSalt:from.randomSalt,
    isVisible:from.isVisible,
    facingDirection:from.facingDirection,
    bodyOrientation:from.bodyOrientation,
    description:from.description,
    items:from.items.map(duplicateItem),
    leftHandItem:from.leftHandItem ? duplicateItem(from.leftHandItem) : null,
    rightHandItem:from.rightHandItem ? duplicateItem(from.rightHandItem) : null,
    position:duplicatePosition(from.position)
  };
}

export default Character;