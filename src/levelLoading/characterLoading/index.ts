import Character, { BodyOrientation, createDefaultCharacter, DEFAULT_BODY_ORIENTATION, DEFAULT_FACING_DIRECTION, FacingDirection, MutableCharacter, VALID_BODY_ORIENTATIONS, VALID_FACING_DIRECTIONS } from "@/game/types/Character";
import { ErrorCollector } from "../errorCollection";
import SectionEntryMap from "../types/SectionEntryMap";
import { createNormalizedSectionEntryMap, describeAllowedValues, getSectionIdsFromSectionText, parseBoolean } from "../levelFileSectionUtil";
import { assertNonNullable } from "decent-portal";
import { parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import { getFaceImageAssetUrl } from "@/game/imageUrlUtil";
import { rand } from "@/common/randUtil";
import { parseItem, parseItems } from "../itemLoading";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { findAllCharacterPositions } from "../roomLoading";
import { mergeCharacterItems } from "./characterItemUtil";
import Item from "@/game/types/Item";
import { MutableLevel } from "@/game/types/Level";

type PartiallyLoadedCharacters = {
  characters:MutableCharacter[],
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

function _parseCharacter(characterId:string, position:Position, characterSectionEntry:SectionEntryWithLine,
  errors:ErrorCollector):{character:Character, isTitleKnown:boolean} {
  const nameValues = parseUniqueNameValueLines(characterSectionEntry.value, `character ${characterId}`, false, characterSectionEntry.lineNo);
  const authoredCharacterName = characterSectionEntry.name.trim();
  const title = nameValues.title ?? authoredCharacterName;
  const description = nameValues.description ?? '';
  const faceImageUrl = nameValues.faceImage ? getFaceImageAssetUrl(nameValues.faceImage.trim()) : null;
  const isVisible = parseBoolean(nameValues.visible ?? 'true', errors, ['characters', characterId], 'faceImage');
  const facingDirection = _parseFacingDirection(nameValues.facingDirection ?? DEFAULT_FACING_DIRECTION, errors, characterId);
  const bodyOrientation = _parseBodyOrientation(nameValues.bodyOrientation ?? 'standing', errors, characterId);
  const isTitleKnown = parseBoolean(nameValues.isTitleKnown ?? 'false', errors, ['characters', characterId], 'isTitleKnown');
  const items = parseItems(nameValues.items ?? '');
  const leftHandItem = parseItem(nameValues.leftHand ?? '');
  const rightHandItem = parseItem(nameValues.rightHand ?? '');
  const character:MutableCharacter = {
    ...createDefaultCharacter(),
    id:characterId, title:title, description, faceImageUrl, randomSalt:rand(), isVisible, facingDirection, 
    bodyOrientation, items, leftHandItem, rightHandItem, position
  }
  return { character, isTitleKnown };
}

export function loadCharactersPartially(charactersSectionText:string, roomsSectionText:string, rooms:Room[],
  errors:ErrorCollector):PartiallyLoadedCharacters|null {
  const originalErrorCount = errors.count;

  if (!charactersSectionText) return { characters:[], initiallyKnownTitleCharacterIds:new Set<string>() };

  const characterIds = getSectionIdsFromSectionText(charactersSectionText, 2, 'characters', errors);
  const characterIdToPosition = findAllCharacterPositions(rooms, characterIds, roomsSectionText, errors);

  const characterSectionsById:SectionEntryMap = createNormalizedSectionEntryMap(charactersSectionText, 2, 'characters', errors);
  const characterSectionNames:string[] = [...characterSectionsById.keys()];
  const characters:Character[] = [];
  const initiallyKnownTitleCharacterIds = new Set<string>();
  characterSectionNames.forEach(sectionName => {
    const sectionEntry = characterSectionsById.get(sectionName);
    assertNonNullable(sectionEntry);
    const characterId = normalizeId(sectionName);
    const fromPosition = characterIdToPosition[characterId] ?? null; // Due to importing, its possible to have unplaced characters.
    if (fromPosition) {
      const { character, isTitleKnown } = _parseCharacter(characterId, fromPosition, sectionEntry, errors);
      characters.push(character);
      if (isTitleKnown) initiallyKnownTitleCharacterIds.add(character.id);
    }
  });
  
  return errors.count <= originalErrorCount ? { characters, initiallyKnownTitleCharacterIds } : null;
}

export function addCharactersToLevel(characters:MutableCharacter[], items:Item[], level:MutableLevel, errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  assertNonNullable(level.activeCharacterId);

  mergeCharacterItems(characters, items, errors);
  level.characters = characters;
  
  return errors.count <= originalErrorCount;
}