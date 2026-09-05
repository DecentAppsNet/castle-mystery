import Character, { BodyOrientation, createDefaultCharacter, FacingDirection } from "@/game/types/Character";
import Item, { duplicateItem } from "@/game/types/Item";
import Position, { duplicatePosition } from "@/game/types/Position";
import Effect, { duplicateEffect } from "../effects/types/Effect";
import { DEFAULT_SKIN_ID } from "./CharacterSkin";

type CharacterKeyframe = {
  isVisible: boolean;
  facingDirection: FacingDirection;
  bodyOrientation: BodyOrientation;
  items: Item[];
  leftHandItem: Item | null;
  rightHandItem: Item | null;
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
    skinId:DEFAULT_SKIN_ID,
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

export const CHARACTER_KEYFRAME_KEYS = Object.keys(createDefaultCharacterKeyframe());

export default CharacterKeyframe;