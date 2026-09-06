/* This file creates, interprets, and validates character skin identifiers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import { assert } from "decent-portal";
import { NO_SKIN_DEFAULT } from "../activityLoading/activitySchedulers/appearsScheduler";

/**
 * Creates the normalized unique identifier for a character skin.
 *
 * @param characterName - Authored or normalized character name.
 * @param skinName - Authored or normalized skin name.
 * @returns The normalized identifier combining the character and skin names.
 */
export function createSkinId(characterName:string, skinName:string):string {
  const characterId = normalizeId(characterName); // normalizeID() is idempotent, so no harm in re-normalizing.
  const normalizedSkinName = normalizeId(skinName);
  return `${characterId}-${normalizedSkinName}`;
}

/**
 * Extracts a normalized skin name from its combined skin identifier.
 *
 * @param skinId - Normalized identifier created by `createSkinId()`.
 * @returns The skin-name portion of the identifier.
 * @throws If `skinId` does not contain exactly one hyphen.
 */
export function skinIdToName(skinId:string):string {
  const tokens = skinId.split('-');
  assert(tokens.length === 2);
  return tokens[1];
}

/**
 * Validates an authored skin name.
 *
 * @param skinName - Skin name to validate.
 * @returns An authoring error message, or `null` when the name is valid.
 */
export function validateSkinName(skinName:string):string|null {
  if (normalizeId(skinName) === NO_SKIN_DEFAULT) return `Can't use reserved word "${NO_SKIN_DEFAULT}" as name of a skin.`; // TODO - "default" will be picked up already as a reserved word. See if you can generalize the checks for all IDs against that reserved word list. I'm thinking that it can be done in the same function that creates parsing rules - compare the allowed values to reserved words.
  if (skinName.indexOf('-') !== -1) return `Can't use "${skinName}" as name of a skin, because it includes a hyphen.`;
  return null;
}