import { createActivityParsingRules } from "./activityParsing/parsingRulesUtil";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "./activityParsing/types/ActivityParsingRules";

export function initActivityParsingRules(allowedValuesByIdentifierId:AllowedValuesByIdentifierId):ActivityParsingRules {
  const roomIds = allowedValuesByIdentifierId['RoomId'];
  const characterIds = allowedValuesByIdentifierId['CharacterId'];
  const itemIds = allowedValuesByIdentifierId['ITemId'];
  const appearanceIds = allowedValuesByIdentifierId['AppearanceId'];
  const rules = createActivityParsingRules(characterIds, roomIds, itemIds, appearanceIds);
  return rules;
}