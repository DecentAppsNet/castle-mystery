import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableItinerary from "@/levelLoading2/itineraryLoading/types/EditableItinerary";
import { ErrorCollector } from "@/levelLoading2/errorCollection";
//import { assert, assertNonNullable } from "decent-portal";

export function createTakesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const takes = makeVerb('takes');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeLiteralOptions(['in', 'into']);
  const target = makeLiteralOptions(['left hand', 'right hand', 'inventory']);
  const targetSequence = makeSequence([preposition, target], true);
  const rootParseStep = makeSequence([characterId, takes, itemId, targetSequence]);
  return createParseFormat(rootParseStep);
}

export function scheduleTakesActivity(_level:Level, 
    activity:Activity, _editableItinerary:EditableItinerary, _errors:ErrorCollector):boolean {
  if (activity.startTime === null) return false; // Can't be scheduled yet. TODO - move to calling code.
  
  /* const { characterId, itemId, _target } = activity.parts;

  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof itemId === 'string');
  const character = level.characters.find(c => c.id === characterId);
  const item = level.itemsById.get(itemId);
  assertNonNullable(character);
  assertNonNullable(item); */

  // const characterI = editableItinerary.characterIdToI[characterId];
  
  // TODO
  return true;
}