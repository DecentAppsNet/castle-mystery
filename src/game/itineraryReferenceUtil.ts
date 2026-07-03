import Character from "./types/Character";
import Level from "./types/Level";
import { createItemsById } from "./itemUtil";
import BecomesCharacterEvent from "./types/itineraryEvents/BecomesCharacterEvent";
import BecomesItemEvent from "./types/itineraryEvents/BecomesItemEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";

type LevelCharacters = Pick<Level, 'initialCharacters' | 'characters'>;

export function findItinerarySourceCharacters(level:LevelCharacters):ReadonlyArray<Character> {
  return level.initialCharacters.length ? level.initialCharacters : level.characters;
}

export function findBecomesTargetCharacterIds(level:LevelCharacters):Set<string> {
  const targetCharacterIds = new Set<string>();
  findItinerarySourceCharacters(level).forEach(character => character.itinerary.forEach(event => {
    if (event.type !== ItineraryEventType.BECOMES_CHARACTER) return;
    targetCharacterIds.add((event as BecomesCharacterEvent).targetCharacterId);
  }));
  return targetCharacterIds;
}

export function findBecomesTargetItemIds(level:Pick<Level, 'allCharactersById'>):Set<string> {
  const targetItemIds = new Set<string>();
  level.allCharactersById.forEach(character => character.itinerary.forEach(event => {
    if (event.type !== ItineraryEventType.BECOMES_ITEM) return;
    targetItemIds.add((event as BecomesItemEvent).targetItemId);
  }));
  return targetItemIds;
}

export function findDirectReferencedCharacterIds(level:LevelCharacters):Set<string> {
  const characterIds = new Set(findItinerarySourceCharacters(level).map(character => character.id));
  findBecomesTargetCharacterIds(level).forEach(characterId => characterIds.add(characterId));
  return characterIds;
}

export function findDirectReferencedItemIds(level:Pick<Level, 'initialCharacters' | 'characters' | 'rooms' | 'allCharactersById'>):Set<string> {
  const itemIds = new Set(createItemsById(level.rooms, findItinerarySourceCharacters(level)).keys());
  findBecomesTargetItemIds(level).forEach(itemId => itemIds.add(itemId));
  return itemIds;
}