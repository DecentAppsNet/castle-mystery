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
  const variables = createSectionVariables(conclusionsSectionText, 'conclusions', errors);
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
  return { id:'rooms', authoredName:'rooms', allowedValues:rooms.map(r => r.title) }
}

function _charactersToCategory(characters:Character[]):ClozeCategory {
  return { id:'characters', authoredName:'characters', allowedValues:characters.filter(isCharacterInteractive).map(c => c.title) }
}

function _itemsToCategory(items:Item[]):ClozeCategory {
  return { id:'items', authoredName:'items', allowedValues:items.filter(isItemInteractive).map(c => c.title) }
}

export function createClozeCategories(conclusionsSectionText:string, rooms:Room[], characters:Character[], items:Item[], 
  errors:ErrorCollector):Record<string, ClozeCategory> {
    const categories = _parseAuthoredClozeCategories(conclusionsSectionText, errors);
    if (!categories.characters) categories.characters = _charactersToCategory(characters);
    if (!categories.rooms) categories.rooms = _roomsToCategory(rooms);
    if (!categories.items) categories.items = _itemsToCategory(items);
    return categories;
}
