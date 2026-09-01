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
import ClozeBlank from "@/game/conclusions/types/ClozeBlank";
import { createNormalizedSectionEntryMap, createSectionVariables, getSectionIdsFromSectionText } from "../levelFileSectionUtil";
import { parseOptions } from "@/common/markdownUtil";
import { normalizeCategoryPhrase, resolveRevealRoomIds, resolveUnlockConclusionIds } from "./commonUtil";
import Room from "@/game/types/Room";
import { normalizeId } from "@/game/idUtil";

function _findCharactersForConclusionOptions(characters:readonly Character[],
  initiallyKnownTitleCharacterIds:ReadonlySet<string>):Character[] {
  const conclusionCharacters:Character[] = characters.filter(character =>
    isCharacterInteractive(character) && !initiallyKnownTitleCharacterIds.has(character.id));
  const sorted = conclusionCharacters.sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity:'base'}));
  return sorted;
}

function _getCharacterFaceImageUrl(character:Character):string {
  return character.faceImageUrl ?? UNKNOWN_CHARACTER_ICON_URL;
}

function _createClozeBlankFromCorrectAnswer(correctAnswer:string, conclusionOptions:string[]):ClozeBlank {
  const clozeCategories:Record<string, ClozeCategory> = {};
  const id = 'characters';
  clozeCategories[id] = {id, authoredName:id, allowedValues:conclusionOptions}; 
  return createClozeBlankFromTemplateText(correctAnswer, clozeCategories);
}

function _findAuthoredOverrides(conclusionsSectionText:string, rooms:readonly Room[],
  initiallyObscuredRoomIds:ReadonlySet<string>, errors:ErrorCollector):{
  title:string|null,
  unlockConclusionIds:string[]|null,
  revealRoomIds:string[]|null,
  characterOptions:string[]|null
} {
  let title = null, unlockConclusionIds = null, revealRoomIds = null, characterOptions = null;
  if (conclusionsSectionText.trim() === '') return {title, unlockConclusionIds, revealRoomIds, characterOptions};
  const conclusionsVariables = createSectionVariables(conclusionsSectionText, 'conclusions', errors);
  const characterOptionsText = conclusionsVariables.characters ?? null;
  if (characterOptionsText) characterOptions = parseOptions(characterOptionsText.value);

  const conclusionIds = getSectionIdsFromSectionText(conclusionsSectionText, 2, 'conclusions', errors);
  const normalizedSections = createNormalizedSectionEntryMap(conclusionsSectionText, 2, 'conclusions', errors);
  const identitiesSectionText = normalizedSections.get('identities')?.value;
  if (identitiesSectionText) {
    const identitiesVariables = createSectionVariables(identitiesSectionText, ['conclusions', 'identities'], errors);
    title = identitiesVariables.title?.value ?? null;
    const unlockConclusionsText = identitiesVariables.unlockconclusions?.value;
    if (unlockConclusionsText) {
      unlockConclusionIds = resolveUnlockConclusionIds('identities', unlockConclusionsText, conclusionIds, errors)
    }
    const revealRoomsText = identitiesVariables.revealrooms?.value;
    if (revealRoomsText) {
      revealRoomIds = resolveRevealRoomIds('identities', revealRoomsText, rooms, initiallyObscuredRoomIds, errors);
    }
  }
  return { title, unlockConclusionIds, revealRoomIds, characterOptions };
}

function _findCharacterByIdOrTitle(characters:readonly Character[], characterRef:string):Character|null {
  const maybeCharacterId = normalizeId(characterRef);
  const maybeCharacterTitle = normalizeCategoryPhrase(characterRef);
  return characters.find(c => 
    c.id === maybeCharacterId || normalizeCategoryPhrase(c.title) === maybeCharacterTitle) ?? null;
}

function _findCharactersForOptions(characterOptions:string[], characters:readonly Character[], 
    errors:ErrorCollector):readonly Character[] {
  return characterOptions.map(characterRef => {
    const character = _findCharacterByIdOrTitle(characters, characterRef);
    if (character) return character;
    errors.addAt(`Could not find character matching "${characterRef}".`, 'conclusions', '* characters=', characterRef);
    return null;
  }).filter(c => c !== null);
}

function _generateConclusionOptions(authoredCharacterOptions:string[]|null, characters:readonly Character[], 
    initiallyKnownTitleCharacterIds:ReadonlySet<string>, errors:ErrorCollector):{
      characterOptions:string[], conclusionCharacters:readonly Character[]
    } {
  if (authoredCharacterOptions) {
    const conclusionCharacters = _findCharactersForOptions(authoredCharacterOptions, characters, errors);
    return { characterOptions:authoredCharacterOptions, conclusionCharacters };
  }
  const conclusionCharacters = _findCharactersForConclusionOptions(characters, initiallyKnownTitleCharacterIds);
  if (!conclusionCharacters.length) return  { characterOptions:[], conclusionCharacters:[] }; // Not an error - every character title can be initially known.
  return {characterOptions:conclusionCharacters.map(c => c.title), conclusionCharacters };
}

/** Generates an identities conclusion unless all character titles are initially known. */
export function createGeneratedIdentityConclusion(conclusionsSectionText:string, characters:readonly Character[], 
    rooms:readonly Room[], initiallyKnownTitleCharacterIds:ReadonlySet<string>,
    initiallyObscuredRoomIds:ReadonlySet<string>, errors:ErrorCollector):Conclusion|null {
  const overrides = _findAuthoredOverrides(conclusionsSectionText, rooms, initiallyObscuredRoomIds, errors);
  
  const { conclusionCharacters, characterOptions} = _generateConclusionOptions(overrides.characterOptions, characters,
    initiallyKnownTitleCharacterIds, errors);
  if (!characterOptions.length) return null;
    
  const parts:ClozePart[] = [];
  conclusionCharacters
    .filter(character => !initiallyKnownTitleCharacterIds.has(character.id))
    .forEach((character, characterI) => {
      if (characterI > 0) parts.push({ type:ClozePartType.separator });
      parts.push({ type:ClozePartType.image, imageUrl:_getCharacterFaceImageUrl(character) });
      parts.push({ type:ClozePartType.text, text:' = ' });
      parts.push(_createClozeBlankFromCorrectAnswer(character.title, characterOptions));
    });
  if (!parts.length) return null;

  const conclusion:Conclusion = {
    id:'identities',
    title:overrides.title ?? 'Identities',
    parts,
    unlockConclusionIds:overrides.unlockConclusionIds ?? [],
    revealRoomIds:overrides.revealRoomIds ?? [],
    isComplete:false,
    isLocked:false
  }
  return conclusion;
}

/** Reports whether a conclusion list already contains an identities conclusion. */
export function hasIdentitiesConclusion(conclusions:Conclusion[]):boolean {
  return conclusions.some(c => c.id === 'identities');
}