/* This file applies shared character-selection state changes and feedback for player events.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";
import Character from "../types/Character";
import GameState from "../types/GameState";
import CharacterWithEffects from "../types/CharacterWithEffects";
import { updateTimelineSnapshotActiveContext } from "../timeline";
import { createCharacterSelectionEffect } from "../effects/characterSelectionEffectUtil";
import { appendCharacterMetaTimeEffect } from "../effects/metaTimeEffectUtil";

function _findSkinIdForCharacter(characters:Character[], characterId:string):string {
  const character = characters.find(c => c.id === characterId);
  assertNonNullable(character);
  return character.skinId;
}

export function selectCharacter(gameState:GameState, snapshotCharacters:CharacterWithEffects[], character:Character, metaTime:number) {
  gameState.activeCharacterId = character.id;
  gameState.activeSkinIdAtSelection = _findSkinIdForCharacter(snapshotCharacters, character.id);
  updateTimelineSnapshotActiveContext(gameState.timelineSnapshot, character.id);
  const effect = createCharacterSelectionEffect(metaTime);
  appendCharacterMetaTimeEffect(gameState.characterMetaTimeEffectsByCharacterId, character.id, effect);
}