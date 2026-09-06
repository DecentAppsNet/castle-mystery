/* This file initializes activity parsing rules from allowed level identifiers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createActivityParsingRules } from "./parsingRulesUtil";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "./types/ActivityParsingRules";

/** Creates activity parsing rules from allowed room, character, item, and appearance IDs. */
export function initActivityParsingRules(allowedValuesByIdentifierId:AllowedValuesByIdentifierId):ActivityParsingRules {
  const roomIds = allowedValuesByIdentifierId['RoomId'];
  const characterIds = allowedValuesByIdentifierId['CharacterId'];
  const itemIds = allowedValuesByIdentifierId['ItemId'];
  const skinNames = allowedValuesByIdentifierId['SkinName'];
  const rules = createActivityParsingRules(characterIds, roomIds, itemIds, skinNames);
  return rules;
}