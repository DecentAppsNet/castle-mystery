import { createActivityParsingRules } from "./parsingRulesUtil";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "./types/ActivityParsingRules";

export function initActivityParsingRules(allowedValuesByIdentifierId:AllowedValuesByIdentifierId):ActivityParsingRules {
  const roomIds = allowedValuesByIdentifierId['RoomId'];
  const characterIds = allowedValuesByIdentifierId['CharacterId'];
  const itemIds = allowedValuesByIdentifierId['ItemId'];
  const appearanceIds = allowedValuesByIdentifierId['AppearanceId'];
  const rules = createActivityParsingRules(characterIds, roomIds, itemIds, appearanceIds);
  return rules;
}