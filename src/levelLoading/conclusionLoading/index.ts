/* This file coordinates authored and generated conclusion loading and initial lock state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion from "@/game/conclusions/types/Conclusion";
import { ErrorCollector } from "../errorCollection";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import { createClozeCategories } from "./clozeCategoryUtil";
import { lockConclusionsAsNeeded, parseAuthoredConclusions } from "./parseConclusionUtil";
import { createGeneratedIdentityConclusion, hasIdentitiesConclusion } from "./identitiesConclusionUtil";

/** Loads authored conclusions, adds identities when needed, and applies dependency locks. */
export function loadConclusions(conclusionsSectionText:string, characters:Character[], items:Item[], 
  rooms:Room[], initiallyKnownTitleCharacterIds:ReadonlySet<string>, initiallyObscuredRoomIds:ReadonlySet<string>,
  errors:ErrorCollector):Conclusion[] {
  const originalErrorCount = errors.count;
  const categories = createClozeCategories(conclusionsSectionText, rooms, characters, items, errors);
  const conclusions = parseAuthoredConclusions(conclusionsSectionText, rooms, categories, initiallyObscuredRoomIds, errors) ?? [];
  if (!hasIdentitiesConclusion(conclusions)) {
    const identitiesConclusion = createGeneratedIdentityConclusion(conclusionsSectionText, characters, rooms,
      initiallyKnownTitleCharacterIds, initiallyObscuredRoomIds, errors);
    if (identitiesConclusion) conclusions.unshift(identitiesConclusion);
  }
  lockConclusionsAsNeeded(conclusions);
  return errors.count <= originalErrorCount ? conclusions : [];
}