/* This file constructs isolated character keyframe fixtures for tests.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createDefaultCharacter } from '../types/Character';
import CharacterKeyframe from '../types/CharacterKeyframe';

export function createCharacterKeyframeForTest():CharacterKeyframe {
  const character = createDefaultCharacter();
  return {
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    items:character.items,
    leftHandItem:character.leftHandItem,
    rightHandItem:character.rightHandItem,
    position:character.position,
    skinId:character.skinId,
    effects:[]
  };
}