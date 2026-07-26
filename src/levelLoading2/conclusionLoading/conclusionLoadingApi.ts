import Conclusion from "@/game/conclusions/types/Conclusion";
import ErrorCollector from "../errorCollection/ErrorCollector";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import { createClozeCategories } from "./clozeCategoryUtil";
import { lockConclusionsAsNeeded, parseAuthoredConclusions } from "./parseConclusionUtil";
import { createGeneratedIdentityConclusion, hasIdentitiesConclusion } from "./identitiesConclusionUtil";

export function loadConclusions(conclusionsSectionText:string, characters:Character[], items:Item[], 
    rooms:Room[], errors:ErrorCollector):Conclusion[] {
  const originalErrorCount = errors.count;
  const categories = createClozeCategories(conclusionsSectionText, rooms, characters, items, errors);
  const conclusions = parseAuthoredConclusions(conclusionsSectionText, rooms, categories, errors) ?? [];
  if (!hasIdentitiesConclusion(conclusions)) {
    const identitiesConclusion = createGeneratedIdentityConclusion(conclusionsSectionText, characters, rooms, errors);
    if (identitiesConclusion) conclusions.unshift(identitiesConclusion);
  }
  lockConclusionsAsNeeded(conclusions);
  return errors.count <= originalErrorCount ? conclusions : [];
}