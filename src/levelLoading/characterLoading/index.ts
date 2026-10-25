/* This file parses character definitions and resolves their positions and item references.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Character, { BodyOrientation, createDefaultCharacter, DEFAULT_BODY_ORIENTATION, DEFAULT_FACING_DIRECTION, FacingDirection, MutableCharacter, VALID_BODY_ORIENTATIONS, VALID_FACING_DIRECTIONS } from "@/game/types/Character";
import { ErrorCollector } from "../errorCollection";
import SectionEntryMap from "../types/SectionEntryMap";
import { createNormalizedSectionEntryMap, describeAllowedValues, getSectionIdsFromSectionText, parseBoolean } from "../levelFileSectionUtil";
import { assertNonNullable } from "decent-portal";
import { parseSectionEntriesWithLines, parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import { getBodyImageAssetUrl } from "@/game/imageUrlUtil";
import { createDefaultCharacterBody, replaceHeadImage } from "@/game/characterBody";
import { rand } from "@/common/randUtil";
import { parseItem, parseItems } from "../itemLoading";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import Position, { createDefaultPosition } from "@/game/types/Position";
import { findAllCharacterPositions } from "../roomLoading";
import { mergeCharacterItems } from "./characterItemUtil";
import Item from "@/game/types/Item";
import { MutableLevel } from "@/game/types/Level";
import CharacterSkin from "@/game/types/CharacterSkin";
import { createDefaultSkinId, createSkinId } from "../generalLoading";
import { NO_SKIN_DEFAULT } from "../activityLoading/activitySchedulers/appearsScheduler";

type PartiallyLoadedCharacters = {
  allCharacters:MutableCharacter[],
  placedCharacters:MutableCharacter[],
  initiallyKnownTitleCharacterIds:ReadonlySet<string>
}

function _parseFacingDirection(text:string, errors:ErrorCollector, characterId:string):FacingDirection {
  text = text.trim().toLowerCase();
  if (VALID_FACING_DIRECTIONS.some(fd => fd === text)) return text as FacingDirection;
  errors.addAt(`"${text}" was not an expected value (${describeAllowedValues(VALID_FACING_DIRECTIONS)}.`, 
      ['characters', characterId], `* facing=`, text);
  return DEFAULT_FACING_DIRECTION;
}

function _parseBodyOrientation(text:string, errors:ErrorCollector, characterId:string):BodyOrientation {
  text = text.trim().toLowerCase();
  if (VALID_BODY_ORIENTATIONS.some(bo => bo === text)) return text as BodyOrientation;
  errors.addAt(`"${text}" was not an expected valoue (${describeAllowedValues(VALID_BODY_ORIENTATIONS)}.`,
    ['characters', characterId], `* bodyOrientation=`, text);
  return DEFAULT_BODY_ORIENTATION;
}

function _parseCharacterSkins(characterSectionEntry:SectionEntryWithLine, characterId:string, errors:ErrorCollector):CharacterSkin[] {
  const entries = parseSectionEntriesWithLines(characterSectionEntry.value, 3, false, characterSectionEntry.lineNo);
  if (!entries.length) return [];
  return entries.map(entry => {
    const nameValues = parseUniqueNameValueLines(entry.value, `character skin "${entry.name}"`, false, entry.lineNo);
    const skinName = normalizeId(entry.name);
    if (skinName === NO_SKIN_DEFAULT) {
      errors.addAt(`"${NO_SKIN_DEFAULT}" can't be used as name of a character skin because it is a reserved word.`, ['characters', characterId, 'default']);
    } // Okay to fall through and return something. An upstream caller can check for added errors.
    const id = createSkinId(characterId, skinName);
    const description = nameValues.description ?? null;
    const headImageUrl = nameValues.headImage ? getBodyImageAssetUrl(nameValues.headImage.trim()) : null;
    return { id, description, headImageUrl };
  });
}

function _parseInitialSkinId(appearanceText:string, characterId:string, skins:readonly CharacterSkin[], errors:ErrorCollector):string {
  const skinName = normalizeId(appearanceText);
  if (skinName === NO_SKIN_DEFAULT) return createDefaultSkinId(characterId);
  const skinId = createSkinId(characterId, skinName);
  if (skins.some(skin => skin.id === skinId)) return skinId;
  errors.addAt(`Unknown initial appearance "${appearanceText}". Use a skin heading belonging to this character or "default".`,
    ['characters', characterId], '* appearsAs=');
  return createDefaultSkinId(characterId);
}

function _parseCharacter(characterId:string, position:Position|null, characterSectionEntry:SectionEntryWithLine,
    errors:ErrorCollector):{character:Character, isTitleKnown:boolean} {
  
  if (!position) position = createDefaultPosition(); // This is an invalid position within the level. Since character is unplaced, that's fine.
  const skins = _parseCharacterSkins(characterSectionEntry, characterId, errors);
  const nameValues = parseUniqueNameValueLines(characterSectionEntry.value, `character ${characterId}`, false, characterSectionEntry.lineNo);
  const authoredCharacterName = characterSectionEntry.name.trim();
  const title = nameValues.title ?? authoredCharacterName;
  const description = nameValues.description ?? '';
  const headImageUrl = nameValues.headImage ? getBodyImageAssetUrl(nameValues.headImage.trim()) : null;
  const isVisible = parseBoolean(nameValues.visible ?? 'true', errors, ['characters', characterId], 'visible');
  const facingDirection = _parseFacingDirection(nameValues.facing ?? DEFAULT_FACING_DIRECTION, errors, characterId);
  const bodyOrientation = _parseBodyOrientation(nameValues.orientation ?? 'standing', errors, characterId);
  const isTitleKnown = parseBoolean(nameValues.isTitleKnown ?? 'false', errors, ['characters', characterId], 'isTitleKnown');
  const items = parseItems(nameValues.items ?? '');
  const leftHandItem = parseItem(nameValues.leftHand ?? '');
  const rightHandItem = parseItem(nameValues.rightHand ?? '');
  const skinId = nameValues.appearsAs === undefined ? createDefaultSkinId(characterId)
    : _parseInitialSkinId(nameValues.appearsAs, characterId, skins, errors);
  const character:MutableCharacter = {
    ...createDefaultCharacter(),
    id:characterId, title:title, description, randomSalt:rand(), isVisible, facingDirection,
    bodyOrientation, items, leftHandItem, rightHandItem, position, skins, skinId,
    rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), headImageUrl)
  }
  return { character, isTitleKnown };
}

/** Parses positioned characters while deferring resolution of their item references. */
export function loadCharactersPartially(charactersSectionText:string, roomsSectionText:string, rooms:Room[],
    errors:ErrorCollector):PartiallyLoadedCharacters|null {
  const originalErrorCount = errors.count;

  if (!charactersSectionText) return { placedCharacters:[], allCharacters:[], initiallyKnownTitleCharacterIds:new Set<string>() };

  function _isPlacedCharacter(position:Position|null) { return position !== null; }

  const characterIds = getSectionIdsFromSectionText(charactersSectionText, 2, 'characters', errors);
  const characterIdToPosition = findAllCharacterPositions(rooms, characterIds, roomsSectionText, errors);

  const characterSectionsById:SectionEntryMap = createNormalizedSectionEntryMap(charactersSectionText, 2, 'characters', errors);
  const characterSectionNames:string[] = [...characterSectionsById.keys()];
  const placedCharacters:Character[] = [];
  const allCharacters:Character[] = [];
  const initiallyKnownTitleCharacterIds = new Set<string>();
  characterSectionNames.forEach(sectionName => {
    const sectionEntry = characterSectionsById.get(sectionName);
    assertNonNullable(sectionEntry);
    const characterId = normalizeId(sectionName);
    const fromPosition = characterIdToPosition[characterId] ?? null; // Due to importing, its possible to have unplaced characters, in which case the position will be undefined.
    const { character, isTitleKnown } = _parseCharacter(characterId, fromPosition, sectionEntry, errors);
    allCharacters.push(character);
    if (isTitleKnown) initiallyKnownTitleCharacterIds.add(character.id);
    if (_isPlacedCharacter(fromPosition)) placedCharacters.push(character);
  });
  
  return errors.count <= originalErrorCount ? { placedCharacters, allCharacters, initiallyKnownTitleCharacterIds } : null;
}

/** Resolves character item references and assigns the characters to the level. */
export function addCharactersToLevel(placedCharacters:MutableCharacter[], items:Item[], level:MutableLevel, errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  assertNonNullable(level.activeCharacterId);

  mergeCharacterItems(placedCharacters, items, errors);
  level.characters = placedCharacters;
  
  return errors.count <= originalErrorCount;
}