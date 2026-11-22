/* This file detects, configures, and generates the character-identities conclusion.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import ClozePart from "@/game/conclusions/types/ClozePart";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import Conclusion from "@/game/conclusions/types/Conclusion";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import Character from "@/game/types/Character";
import ClozeCategory from "./types/ClozeCategory";
import { ErrorCollector } from "../errorCollection";
import { UNKNOWN_CHARACTER_ICON_URL } from "@/game/discoveryIconUrlUtil";
import { createClozeBlankFromTemplateText } from "./parseConclusionUtil";
import { createNormalizedSectionEntryMap, createSectionVariables, getSectionIdsFromSectionText, parseBoolean } from "../levelFileSectionUtil";
import { resolveRevealRoomIds, resolveUnlockConclusionIds } from "./commonUtil";
import Room from "@/game/types/Room";
import { randIntInRange } from "@/common/randUtil";
import { assertNonNullable } from "decent-portal";
import { getHeadImageUrl } from '@/game/characterBody';

function _randomizeIdentityRows(characters:readonly Character[]):Character[] {
  const shuffled = [...characters];
  for(let i = shuffled.length - 1; i > 0; --i) {
    const swapI = randIntInRange(0, i + 1);
    assertNonNullable(shuffled[swapI]);
    assertNonNullable(shuffled[i]);
    const swapValue = shuffled[swapI];
    shuffled[swapI] = shuffled[i]!;
    shuffled[i] = swapValue;
  }
  return shuffled;
}

function _findIdentityRowCharacters(placedCharacters:readonly Character[],
    initiallyKnownTitleCharacterIds:ReadonlySet<string>):Character[] {
  const characters = placedCharacters.filter(character => isCharacterInteractive(character) && !initiallyKnownTitleCharacterIds.has(character.id));
  return _randomizeIdentityRows(characters);
}

function _getCharacterHeadImageUrl(character:Character):string {
  const initialSkin = character.skins.find(skin => skin.id === character.skinId);
  return initialSkin?.headImageUrl ?? getHeadImageUrl(character.rootBodyPart) ?? UNKNOWN_CHARACTER_ICON_URL;
}

function _findAuthoredOverrides(conclusionsSectionText:string, rooms:readonly Room[],
  initiallyObscuredRoomIds:ReadonlySet<string>, errors:ErrorCollector):{
  title:string|null,
  isOptional:boolean,
  unlockConclusionIds:string[]|null,
  revealRoomIds:string[]|null
} {
  let title = null, unlockConclusionIds = null, revealRoomIds = null;
  let isOptional = false;
  if (conclusionsSectionText.trim() === '') return {title, isOptional, unlockConclusionIds, revealRoomIds};

  const conclusionIds = getSectionIdsFromSectionText(conclusionsSectionText, 2, 'conclusions', errors);
  const normalizedSections = createNormalizedSectionEntryMap(conclusionsSectionText, 2, 'conclusions', errors);
  const identitiesSectionText = normalizedSections.get('identities')?.value;
  if (identitiesSectionText) {
    const identitiesVariables = createSectionVariables(identitiesSectionText, ['conclusions', 'identities'], errors);
    title = identitiesVariables.title?.value ?? null;
    isOptional = parseBoolean(identitiesVariables.isoptional?.value ?? 'false', errors,
      ['conclusions', 'identities'], 'isOptional');
    const unlockConclusionsText = identitiesVariables.unlockconclusions?.value;
    if (unlockConclusionsText) {
      unlockConclusionIds = resolveUnlockConclusionIds('identities', unlockConclusionsText, conclusionIds, errors)
    }
    const revealRoomsText = identitiesVariables.revealrooms?.value;
    if (revealRoomsText) {
      revealRoomIds = resolveRevealRoomIds('identities', revealRoomsText, rooms, initiallyObscuredRoomIds, errors);
    }
  }
  return { title, isOptional, unlockConclusionIds, revealRoomIds };
}

/** Generates an identities conclusion unless all character titles are initially known. */
export function createGeneratedIdentityConclusion(conclusionsSectionText:string, placedCharacters:readonly Character[],
    characterCategory:ClozeCategory, rooms:readonly Room[], initiallyKnownTitleCharacterIds:ReadonlySet<string>,
    initiallyObscuredRoomIds:ReadonlySet<string>, errors:ErrorCollector):Conclusion|null {
  const originalErrorCount = errors.count;

  const overrides = _findAuthoredOverrides(conclusionsSectionText, rooms, initiallyObscuredRoomIds, errors);

  const identityRowCharacters = _findIdentityRowCharacters(placedCharacters, initiallyKnownTitleCharacterIds);
  if (errors.count > originalErrorCount) return null;

  // Use the effective category without rebuilding options from the filtered identity rows.
  const clozeCategories = { characters:characterCategory };
  const parts:ClozePart[] = [];
  identityRowCharacters.forEach((character, characterI) => {
      const blank = createClozeBlankFromTemplateText(character.title, clozeCategories, message =>
        errors.addAt(`Generated identities row ${characterI + 1} for "${character.title}" (characters category): ${message}`,
          ['characters', character.id]));
      if (!blank) return;
      if (characterI > 0) parts.push({ type:ClozePartType.separator });
      parts.push({ type:ClozePartType.image, imageUrl:_getCharacterHeadImageUrl(character) });
      parts.push({ type:ClozePartType.text, text:' = ' });
      parts.push(blank);
    });
  if (!parts.length || errors.count > originalErrorCount) return null;

  const conclusion:Conclusion = {
    incorrectGuessCount:0,
    id:'identities',
    title:overrides.title ?? 'Identities',
    parts,
    unlockConclusionIds:overrides.unlockConclusionIds ?? [],
    revealRoomIds:overrides.revealRoomIds ?? [],
    isComplete:false,
    isOptional:overrides.isOptional,
    isLocked:false
  }
  return conclusion;
}

/** Reports whether a conclusion list already contains an identities conclusion. */
export function hasIdentitiesConclusion(conclusions:Conclusion[]):boolean {
  return conclusions.some(c => c.id === 'identities');
}