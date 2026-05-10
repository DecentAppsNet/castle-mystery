import { assertNonNullable } from "decent-portal";
import Level from "./types/Level";
import Item from "./types/Item";
import Room from "./types/Room";
import Character from './types/Character';
import { findNearestWaypoint, findRoom } from "./roomUtil";
import TimeLabel from "./types/TimeLabel";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { isPositionInRoomObstruction } from "./obstructionUtil";
import { parseFirstFencedCodeBlockLines, parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { parseTimestampToMsecs } from "@/common/timestampUtil";
import { loadItineraries } from "./levelItineraryLoader";
import {
  addRoomExitsFromRoomsSection,
  addRoomPositionMarkersFromSections,
  calcScaledRoomGridPosition,
  createRoomsFromMapSection,
  findLegendTilesInGrid,
  generateRoomWaypointsForLevel
} from "./levelRoomLayoutLoader";

type CharacterDefinition = {
  description:string,
  itemIds:string[]
};

type ItemDefinition = {
  title:string,
  description:string,
  displayChar:string
};

function _createEmptyLevel(duration:number = MSECS_IN_DAY):Level {
  return {
    rooms: [],
    characters: [],
    activeCharacterId: "",
    startTime: 0,
    duration,
    labels: _createTimeLabels(duration)
  };
}

function _parseTimeTextToMsecs(text:string):number {
  return parseTimestampToMsecs(text);
}

function _parseGeneralSection(generalSection:string):{ activeCharacterId:string, startTime:number|null } {
  const generalNameValues = parseNameValueLines(generalSection);
  return {
    activeCharacterId: generalNameValues.activeCharacter || "",
    startTime: generalNameValues.time ? _parseTimeTextToMsecs(generalNameValues.time) : null
  };
}

function _parseCharacterDefinitions(charactersSection:string):Map<string, CharacterDefinition> {
  const characterDefinitions = new Map<string, CharacterDefinition>();
  const characterSections = parseSections(charactersSection, 2);
  Object.entries(characterSections).forEach(([characterId, characterSection]) => {
    const nameValues = parseNameValueLines(characterSection);
    characterDefinitions.set(characterId, {
      description:nameValues.description || "",
      itemIds:parseOptions(nameValues.items || "")
    });
  });
  return characterDefinitions;
}

function _parseItemDefinitions(itemsSection:string):Map<string, ItemDefinition> {
  const itemDefinitions = new Map<string, ItemDefinition>();
  const itemSections = parseSections(itemsSection, 2);
  Object.entries(itemSections).forEach(([itemId, itemSection]) => {
    const nameValues = parseNameValueLines(itemSection);
    itemDefinitions.set(itemId, {
      title:nameValues.title || itemId,
      description:nameValues.description || "",
      displayChar:nameValues.displayChar || itemId.charAt(0) || "?"
    });
  });
  return itemDefinitions;
}

function _createItemFromDefinition(itemId:string, itemDefinitions:Map<string, ItemDefinition>, position:{x:number, y:number}, isDiscovered:boolean):Item {
  const itemDefinition = itemDefinitions.get(itemId);
  return {
    id:itemId,
    title:itemDefinition?.title || itemId,
    displayChar:itemDefinition?.displayChar || itemId.charAt(0) || "?",
    position:{ ...position },
    description:itemDefinition?.description || "",
    isDiscovered
  };
}

function _findNearestUnclaimedWaypoint(room:Room, targetX:number, targetY:number, claimedWaypoints:Set<string>) {
  return findNearestWaypoint(room, targetX, targetY, waypoint => !claimedWaypoints.has(`${waypoint.position.x},${waypoint.position.y}`));
}

function _addCharacter(level:Level, room:Room, characterId:string, description:string, x:number, y:number) {
  const claimedWaypoints = new Set(level.characters.map(character => `${character.waypoint.position.x},${character.waypoint.position.y}`));
  const waypoint = _findNearestUnclaimedWaypoint(room, x, y, claimedWaypoints);
  const character:Character = {
    id: characterId,
    description,
    items: [],
    x:waypoint.position.x,
    y:waypoint.position.y,
    waypoint,
    facingAngle:0,
    itinerary:[],
    itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
  };
  level.characters.push(character);
}

function _addCharactersAndRoomItemsFromSections(level:Level, roomsSection:string,
  characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
  const roomSections = parseSections(roomsSection, 2);

  Object.entries(roomSections).forEach(([roomId, roomSection]) => {
    const room = findRoom(level.rooms, roomId);
    const gridLines = parseFirstFencedCodeBlockLines(roomSection);
    if (!gridLines.length) return;

    const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
    const gridHeight = gridLines.length;
    const roomNameValues = parseNameValueLines(roomSection);
    const roomLegend = Object.fromEntries(
      Object.entries(roomNameValues).filter(([name]) => name !== 'exits')
    );

    findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId, row, col }) => {
      const [x, y] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
      const characterDefinition = characterDefinitions.get(entryId);
      if (characterDefinition) {
        _addCharacter(level, room, entryId, characterDefinition.description, x, y);
        return;
      }
      if (itemDefinitions.has(entryId)) {
        _addItemToRoom(level, roomId, _createItemFromDefinition(entryId, itemDefinitions, { x, y }, false));
      }
    });
  });
}

function _addInventoryItemsToCharacters(level:Level, characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
  level.characters.forEach(character => {
    const characterDefinition = characterDefinitions.get(character.id);
    if (!characterDefinition) return;
    _addItemsToCharacter(level, character.id, characterDefinition.itemIds.map(itemId =>
      _createItemFromDefinition(itemId, itemDefinitions, { x:0, y:0 }, true)
    ));
  });
}

function _formatMinutesAsTimeLabel(minutes:number):string {
  const wholeMinutes = Math.round(minutes);
  const hours24 = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  if (hours24 === 0 && mins === 0) return "midnight";
  if (hours24 === 12 && mins === 0) return "noon";
  const suffix = hours24 < 12 || hours24 === 24 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (mins === 0) return `${hours12}${suffix}`;
  return `${hours12}:${mins.toString().padStart(2, '0')}${suffix}`;
}

function _createTimeLabels(duration:number):TimeLabel[] {
  const durationMinutes = duration / MSECS_IN_MINUTE;
  return [0, .25, .5, .75, 1].map(ratio => {
    const minutes = durationMinutes * ratio;
    return { minutes, label:_formatMinutesAsTimeLabel(minutes) };
  });
}

function _addItemToRoom(level:Level, roomId:string, item:Omit<Item, 'isDiscovered'>) {
  const room = findRoom(level.rooms, roomId);
  assertNonNullable(room);
  const { x, y } = item.position;
  const isInsideRoom = x >= room.rect.x && x <= room.rect.x + room.rect.width
    && y >= room.rect.y && y <= room.rect.y + room.rect.height;
  if (!isInsideRoom) throw new Error(`item ${item.id} is outside room ${roomId}`);
  if (isPositionInRoomObstruction(room, x, y)) throw new Error(`item ${item.id} is inside an obstruction in room ${roomId}`);
  room.items.push({ ...item, isDiscovered:false });
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character, `character ${characterId} not found`);
  character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}

function _findSectionFirstContentLineNo(markdownText:string, sectionName:string, indentLevel:number = 1):number|null {
  const lines = markdownText.split('\n');
  const headingText = `${'#'.repeat(indentLevel)} ${sectionName}`;
  const nextHeadingPrefix = '#'.repeat(indentLevel) + ' ';
  const headingIndex = lines.findIndex(line => line.trim() === headingText);
  if (headingIndex === -1) return null;

  for (let i = headingIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith(nextHeadingPrefix)) return null;
    if (trimmedLine.length > 0) return i + 1;
  }

  return null;
}

export function loadLevelFromText(text:string, levelFilename:string = '<inline>'):Level {
  const sections = parseSections(text);
  const generalSection = _parseGeneralSection(sections.general || "");
  const itinerarySection = sections.itinerary || "";
  const itineraryFirstLineNo = _findSectionFirstContentLineNo(text, 'itinerary') || 1;
  let level = _createEmptyLevel();
  level = {
    ...level,
    activeCharacterId: generalSection.activeCharacterId || level.activeCharacterId,
    startTime: generalSection.startTime ?? level.startTime
  };
  const characterDefinitions = _parseCharacterDefinitions(sections.characters || "");
  const itemDefinitions = _parseItemDefinitions(sections.items || "");
  createRoomsFromMapSection(level, sections.map || "", sections.rooms || "");
  addRoomPositionMarkersFromSections(level, sections.rooms || "", new Set([
    ...characterDefinitions.keys(),
    ...itemDefinitions.keys()
  ]));
  addRoomExitsFromRoomsSection(level, sections.rooms || "");
  generateRoomWaypointsForLevel(level);
  _addCharactersAndRoomItemsFromSections(level, sections.rooms || "", characterDefinitions, itemDefinitions);
  _addInventoryItemsToCharacters(level, characterDefinitions, itemDefinitions);
  const itineraryData = loadItineraries(level, itinerarySection, levelFilename, itineraryFirstLineNo);
  level = {
    ...level,
    activeCharacterId: level.activeCharacterId || level.characters[0]?.id || "",
    characters: itineraryData.characters,
    duration: itineraryData.duration,
    labels: _createTimeLabels(itineraryData.duration)
  };
  return level;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const response = await fetch(levelFileUrl);
  const text = await response.text();
  return loadLevelFromText(text, levelFileUrl);
}