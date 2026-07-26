import { parseOptions } from "@/common/markdownUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import ClozeCategory from "./types/ClozeCategory";
import { createSectionVariables } from "../levelFileSectionUtil";
import { assert } from "decent-portal";
import Room from "@/game/types/Room";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import { isCharacterInteractive, isItemInteractive } from "@/game/interactivityUtil";

function _parseAuthoredClozeCategories(conclusionsSectionText:string, errors:ErrorCollector):Record<string, ClozeCategory> {
  const originalErrorCount = errors.count;
  const variables = createSectionVariables(conclusionsSectionText, 'conclusions', errors);
  if (errors.count > originalErrorCount) return {};
  const clozeCategories:Record<string, ClozeCategory> = {};
  const categoryIds:string[] = Object.keys(variables);
  categoryIds.forEach(id => {
    const { value, authoredName } = variables[id];
    const allowedValues = parseOptions(value);
    assert(clozeCategories[id] === undefined);
    clozeCategories[id] = { id, authoredName, allowedValues };
  });
  return clozeCategories;
}

function _roomsToCategory(rooms:Room[]):ClozeCategory {
  const allowedValues = rooms.map(r => r.title).sort();
  return { id:'rooms', authoredName:'rooms', allowedValues }
}

function _charactersToCategory(characters:Character[]):ClozeCategory {
  const allowedValues = characters.filter(isCharacterInteractive).map(c => c.title).sort();
  return { id:'characters', authoredName:'characters', allowedValues};
}

function _itemsToCategory(items:Item[]):ClozeCategory {
  const allowedValues = items.filter(isItemInteractive).map(c => c.title).sort();
  return { id:'items', authoredName:'items', allowedValues }
}

export function createClozeCategories(conclusionsSectionText:string, rooms:Room[], characters:Character[], items:Item[], 
  errors:ErrorCollector):Record<string, ClozeCategory> {
    const categories = _parseAuthoredClozeCategories(conclusionsSectionText, errors);
    if (!categories.characters) categories.characters = _charactersToCategory(characters);
    if (!categories.rooms) categories.rooms = _roomsToCategory(rooms);
    if (!categories.items) categories.items = _itemsToCategory(items);
    return categories;
}
