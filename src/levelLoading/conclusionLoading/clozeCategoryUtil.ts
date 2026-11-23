/* This file builds authored and entity-derived answer categories for cloze conclusions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { parseOptions } from "@/common/markdownUtil";
import { ErrorCollector } from "../errorCollection";
import ClozeCategory from "./types/ClozeCategory";
import { createSectionVariables } from "../levelFileSectionUtil";
import { assert } from "decent-portal";
import Room from "@/game/types/Room";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import { isCharacterInteractive, isItemInteractive } from "@/game/interactivityUtil";
import { normalizeCategoryPhrase } from "./commonUtil";
import { convertStraightQuotesToDirectional } from "@/common/quoteUtil";

function _uniqueGeneratedValues(values:string[]):string[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const normalized = normalizeCategoryPhrase(value);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function _describeCategory(category:ClozeCategory, authoredCategoryIds:ReadonlySet<string>):string {
  return `${authoredCategoryIds.has(category.id) ? 'authored' : 'generated'} "${category.authoredName}" category`;
}

function _validateCategories(categories:Record<string, ClozeCategory>, authoredCategoryIds:ReadonlySet<string>,
    errors:ErrorCollector):void {
  // Retain the first owner of each normalized phrase across all effective categories.
  const owners:{ [phrase:string]:ClozeCategory | undefined } = Object.create(null);
  for (const category of Object.values(categories)) {
    for (const answer of category.allowedValues) {
      const normalized = normalizeCategoryPhrase(answer);
      const previous = owners[normalized];
      if (!previous) {
        owners[normalized] = category;
        continue;
      }

      // Diagnose replacements as authored, and locate conflicts at an authored entry when possible.
      const description = _describeCategory(category, authoredCategoryIds);
      const generatedCount = Number(!authoredCategoryIds.has(previous.id)) + Number(!authoredCategoryIds.has(category.id));
      const correction = generatedCount === 0 ? 'Remove or rename the overlap.'
        : `Remove or rename the overlap, or replace ${generatedCount === 1 ? 'the' : 'either'} generated category with the intended complete authored list.`;
      const message = previous === category
        ? `The ${description} repeats the answer "${answer}". Remove or rename the duplicate entry.`
        : `Answer "${answer}" overlaps between the ${_describeCategory(previous, authoredCategoryIds)} and the ${description}. ` +
          correction;
      const source = authoredCategoryIds.has(category.id) ? category : previous;
      if (authoredCategoryIds.has(source.id)) {
        errors.addAt(message, 'conclusions', `* ${source.authoredName}=`, answer);
      } else {
        errors.addAt(message, category.id, answer, answer);
      }
    }
  }
}

function _parseAuthoredClozeCategories(conclusionsSectionText:string, errors:ErrorCollector):Record<string, ClozeCategory> {
  const originalErrorCount = errors.count;
  const variables = createSectionVariables(conclusionsSectionText, 'conclusions', errors);
  if (errors.count > originalErrorCount) return {};
  const clozeCategories:Record<string, ClozeCategory> = {};
  const categoryIds:string[] = Object.keys(variables);
  categoryIds.forEach(id => {
    const { value, authoredName } = variables[id];
    const allowedValues = parseOptions(value).map(convertStraightQuotesToDirectional);
    assert(clozeCategories[id] === undefined);
    clozeCategories[id] = { id, authoredName, allowedValues };
  });
  return clozeCategories;
}

function _roomsToCategory(rooms:Room[]):ClozeCategory {
  const allowedValues = _uniqueGeneratedValues(rooms.map(r => r.title).sort());
  return { id:'rooms', authoredName:'rooms', allowedValues }
}

function _charactersToCategory(characters:Character[]):ClozeCategory {
  const allowedValues = _uniqueGeneratedValues(characters.filter(isCharacterInteractive).map(c => c.title).sort());
  return { id:'characters', authoredName:'characters', allowedValues};
}

function _itemsToCategory(items:Item[]):ClozeCategory {
  const allowedValues = _uniqueGeneratedValues(items.filter(isItemInteractive).map(c => c.title).sort());
  return { id:'items', authoredName:'items', allowedValues }
}

/** Builds cloze categories from authored definitions and level entities. */
export function createClozeCategories(conclusionsSectionText:string, rooms:Room[], characters:Character[], items:Item[], 
  errors:ErrorCollector):Record<string, ClozeCategory> {
    // Stop after malformed authored definitions rather than validating a partial category inventory.
    const originalErrorCount = errors.count;
    const categories = _parseAuthoredClozeCategories(conclusionsSectionText, errors);
    if (errors.count > originalErrorCount) return {};
    const authoredCategoryIds = new Set(Object.keys(categories));

    // Apply replacements before deduplicating generated memberships and checking all effective categories.
    if (!categories.characters) categories.characters = _charactersToCategory(characters);
    if (!categories.rooms) categories.rooms = _roomsToCategory(rooms);
    if (!categories.items) categories.items = _itemsToCategory(items);
    _validateCategories(categories, authoredCategoryIds, errors);
    return categories;
}
