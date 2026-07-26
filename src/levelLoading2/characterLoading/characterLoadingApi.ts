import Character, { BodyOrientation, createDefaultCharacter, DEFAULT_BODY_ORIENTATION, DEFAULT_FACING_DIRECTION, FacingDirection, VALID_BODY_ORIENTATIONS, VALID_FACING_DIRECTIONS } from "@/game/types/Character";
import { ErrorCollector } from "../errorCollection/errorCollectionApi";
import SectionEntryMap from "../types/SectionEntryMap";
import { createNormalizedSectionEntryMap, describeAllowedValues, getSectionIdsFromSectionText, parseBoolean } from "../levelFileSectionUtil";
import { assertNonNullable } from "decent-portal";
import { parseUniqueNameValueLines, SectionEntryWithLine } from "@/common/markdownUtil";
import { getFaceImageAssetUrl } from "@/game/imageUrlUtil";
import { rand } from "@/common/randUtil";
import { parseItem, parseItems } from "../itemLoading/itemLoadingApi";
import { normalizeId } from "@/game/idUtil";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { findAllCharacterPositions } from "../roomLoading/roomLoadingApi";
import { mergeCharacterItems } from "./characterItemUtil";
import Item from "@/game/types/Item";
import { MutableLevel } from "@/game/types/Level";

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

function _parseCharacter(characterId:string, position:Position, characterSectionEntry:SectionEntryWithLine, errors:ErrorCollector):Character {
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
  const character:Character = {
    ...createDefaultCharacter(),
    id:characterId, title:title, description, faceImageUrl, randomSalt:rand(), isVisible, facingDirection, 
    bodyOrientation, isTitleKnown, items, leftHandItem, rightHandItem, position
  }
  return character;
}

export function loadCharactersPartially(charactersSectionText:string, roomsSectionText:string, rooms:Room[], errors:ErrorCollector):Character[]|null {
  const originalErroCount = errors.count;

  if (!charactersSectionText) return [];

  const characterIds = getSectionIdsFromSectionText(charactersSectionText, 2, 'characters', errors);
  const characterIdToPosition = findAllCharacterPositions(rooms, characterIds, roomsSectionText, errors);

  const characterSectionsById:SectionEntryMap = createNormalizedSectionEntryMap(charactersSectionText, 2, 'characters', errors);
  const characterSectionNames:string[] = Object.keys(characterSectionsById);
  const characters = characterSectionNames.map(sectionName => {
    const sectionEntry = characterSectionsById.get(sectionName);
    assertNonNullable(sectionEntry);
    const characterId = normalizeId(sectionName);
    const position = characterIdToPosition[characterId];
    assertNonNullable(position);
    return _parseCharacter(characterId, position, sectionEntry, errors);
  });
  
  return errors.count <= originalErroCount ? characters : null;
}

function _createAllCharactersById(characters:Character[]):Map<string, Character> {
  const allCharactersById = new Map<string, Character>();
  characters.forEach(character => allCharactersById.set(character.id, character));
  return allCharactersById;
}

export function addCharactersToLevel(characters:Character[], items:Item[], level:MutableLevel, errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;

  mergeCharacterItems(characters, items, errors);
  level.allCharactersById = _createAllCharactersById(characters);

  return errors.count <= originalErrorCount;
}