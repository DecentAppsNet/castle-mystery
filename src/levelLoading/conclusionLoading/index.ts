/* This file coordinates authored and generated conclusion loading and initial lock state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from "@/conclusions/types/Conclusion";
import { ErrorCollector } from "../errorCollection";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import { createClozeCategories } from "./clozeCategoryUtil";
import { lockConclusionsAsNeeded, parseAuthoredConclusions } from "./parseConclusionUtil";
import { createGeneratedIdentityConclusion, getIdentityCharacterCategory, hasIdentitiesConclusion } from "./identitiesConclusionUtil";
import { validateBlankGroupsAndShareAnswerSets } from './finalizeConclusionsUtil';

/** Loads authored conclusions, adds identities when needed, and applies dependency locks. */
export function loadConclusions(conclusionsSectionText:string, placedCharacters:Character[], items:Item[],
    rooms:Room[], initiallyKnownTitleCharacterIds:ReadonlySet<string>, initiallyObscuredRoomIds:ReadonlySet<string>,
    errors:ErrorCollector):Conclusion[] {
  const originalErrorCount = errors.count;
  const categories = createClozeCategories(conclusionsSectionText, rooms, placedCharacters, items, errors);
  if (errors.count > originalErrorCount) return [];
  const identityCharacterCategory = getIdentityCharacterCategory(categories.characters, placedCharacters, initiallyKnownTitleCharacterIds);
  const conclusions = parseAuthoredConclusions(conclusionsSectionText, rooms, categories, identityCharacterCategory,
    initiallyObscuredRoomIds, errors) ?? [];
  if (!hasIdentitiesConclusion(conclusions)) {
    const identitiesConclusion = createGeneratedIdentityConclusion(conclusionsSectionText, placedCharacters, 
      identityCharacterCategory, rooms, initiallyKnownTitleCharacterIds, initiallyObscuredRoomIds, errors);
    if (identitiesConclusion) conclusions.unshift(identitiesConclusion);
  }
  if (errors.count > originalErrorCount) return [];
  validateBlankGroupsAndShareAnswerSets(conclusions, errors);
  lockConclusionsAsNeeded(conclusions);
  return errors.count <= originalErrorCount ? conclusions : [];
}