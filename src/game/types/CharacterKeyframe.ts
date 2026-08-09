import Character, { BodyOrientation, createDefaultCharacter, FacingDirection } from "@/game/types/Character";
import Item, { duplicateItem } from "@/game/types/Item";
import Position, { duplicatePosition } from "@/game/types/Position";
import EffectCue, { duplicateEffectCue } from "./effectCues/EffectCue";

type CharacterKeyframe = {
  appearanceId: string;
  isVisible: boolean;
  facingDirection: FacingDirection;
  bodyOrientation: BodyOrientation;
  items: Item[];
  leftHandItem: Item | null;
  rightHandItem: Item | null;
  position: Position;
  effectCues: EffectCue[]
};

const DEFAULT_CHARACTER:Character = createDefaultCharacter();

export function createDefaultCharacterKeyframe():CharacterKeyframe {
  return {
    appearanceId:'',
    isVisible:DEFAULT_CHARACTER.isVisible,
    facingDirection:DEFAULT_CHARACTER.facingDirection,
    bodyOrientation:DEFAULT_CHARACTER.bodyOrientation,
    items:DEFAULT_CHARACTER.items,
    leftHandItem:DEFAULT_CHARACTER.leftHandItem,
    rightHandItem:DEFAULT_CHARACTER.rightHandItem,
    position:DEFAULT_CHARACTER.position,
    effectCues:[]
  }
}

export function duplicateCharacterKeyframe(from:CharacterKeyframe):CharacterKeyframe {
  return {
    ...from,
    items:from.items.map(duplicateItem),
    leftHandItem:from.leftHandItem === null ? null : duplicateItem(from.leftHandItem),
    rightHandItem:from.rightHandItem === null ? null : duplicateItem(from.rightHandItem),
    position:duplicatePosition(from.position),
    effectCues:from.effectCues.map(duplicateEffectCue)
  }
}

export const CHARACTER_KEYFRAME_KEYS = Object.keys(createDefaultCharacterKeyframe());

export default CharacterKeyframe;