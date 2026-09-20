import Character, { BodyOrientation, createDefaultCharacter, FacingDirection } from "@/game/types/Character";
import Item, { areItemsEqual, duplicateItem } from "@/game/types/Item";
import Position, { arePositionsEqual, duplicatePosition } from "@/game/types/Position";
import Effect, { duplicateEffect } from "../effects/types/Effect";

type CharacterKeyframe = {
  isVisible: boolean;
  facingDirection: FacingDirection;
  bodyOrientation: BodyOrientation;
  items: Item[];
  leftHandItem: Item|null;
  rightHandItem: Item|null;
  skinId: string,
  position: Position;
  effects: Effect[]
};

const DEFAULT_CHARACTER:Character = createDefaultCharacter();

export function createDefaultCharacterKeyframe():CharacterKeyframe {
  return {
    isVisible:DEFAULT_CHARACTER.isVisible,
    facingDirection:DEFAULT_CHARACTER.facingDirection,
    bodyOrientation:DEFAULT_CHARACTER.bodyOrientation,
    items:DEFAULT_CHARACTER.items,
    leftHandItem:DEFAULT_CHARACTER.leftHandItem,
    rightHandItem:DEFAULT_CHARACTER.rightHandItem,
    position:DEFAULT_CHARACTER.position,
    skinId:DEFAULT_CHARACTER.skinId,
    effects:[]
  }
}

export function duplicateCharacterKeyframe(from:CharacterKeyframe, isDuplicatingEffects = true):CharacterKeyframe {
  return {
    ...from,
    items:from.items.map(duplicateItem),
    leftHandItem:from.leftHandItem === null ? null : duplicateItem(from.leftHandItem),
    rightHandItem:from.rightHandItem === null ? null : duplicateItem(from.rightHandItem),
    position:duplicatePosition(from.position),
    effects:isDuplicatingEffects ? from.effects.map(duplicateEffect) : [...from.effects]
  }
}

function _areNullableItemsEqual(a:Item|null, b:Item|null):boolean {
  if (a === null) return b === null;
  if (b === null) return false;
  return areItemsEqual(a, b);
}

export function areCharacterKeyframesEqual(a:CharacterKeyframe, b:CharacterKeyframe):boolean {
  if (a === b) return true;
  return (a.isVisible === b.isVisible &&
    a.facingDirection === b.facingDirection &&
    a.bodyOrientation === b.bodyOrientation &&
    a.items.length === b.items.length &&
    a.items.every((item:Item, i:number) => areItemsEqual(item, b.items[i])) &&
    _areNullableItemsEqual(a.leftHandItem, b.leftHandItem) &&
    _areNullableItemsEqual(a.rightHandItem, b.rightHandItem) &&
    a.skinId === b.skinId &&
    arePositionsEqual(a.position, b.position) &&
    a.effects.length === b.effects.length &&
    // Effect instances are reused and not mutated, so equality can just check instance.
    a.effects.every((effect:Effect, i:number) => effect === b.effects[i]) 
  );
}

export const CHARACTER_KEYFRAME_KEYS = Object.keys(createDefaultCharacterKeyframe());

export default CharacterKeyframe;