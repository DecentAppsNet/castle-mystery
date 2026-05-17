// Groups character and item definition parsing with room and inventory population during level load.

import { assertNonNullable } from "decent-portal";

import { parseFirstFencedCodeBlockLines, parseOptions, parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { rand } from "@/common/randUtil";
import { isPositionInRoomObstruction } from "../obstructionUtil";
import { calcScaledRoomGridPosition, findLegendTilesInGrid } from "./levelRoomLayoutLoader";
import { findNearestWaypoint, findRoom } from "../roomUtil";
import Character from "../types/Character";
import Item from "../types/Item";
import Level from "../types/Level";
import Room from "../types/Room";
import { assertNormalizedId, createNormalizedEntryMap, normalizeId } from "../idUtil";

type CharacterDefinition = {
	title:string,
	description:string,
	itemIds:string[],
	faceImageUrl:string|null,
	isTitleKnown:boolean
};

type ItemDefinition = {
	title:string,
	description:string,
	displayChar:string
};

export type RoomPopulationDefinitions = {
	characterDefinitions:Map<string, CharacterDefinition>,
	itemDefinitions:Map<string, ItemDefinition>
};

export function parseRoomPopulationDefinitions(charactersSection:string, itemsSection:string):RoomPopulationDefinitions {
	return {
		characterDefinitions: parseCharacterDefinitions(charactersSection),
		itemDefinitions: parseItemDefinitions(itemsSection)
	};
}

export function parseCharacterDefinitions(charactersSection:string):Map<string, CharacterDefinition> {
	const characterDefinitions = new Map<string, CharacterDefinition>();
	const characterSectionsById = createNormalizedEntryMap(Object.entries(parseSections(charactersSection, 2)));
	Array.from(characterSectionsById.entries()).forEach(([characterId, characterSectionEntry]) => {
		const authoredCharacterName = characterSectionEntry.authoredName;
		const characterSection = characterSectionEntry.value;
		const nameValues = parseUniqueNameValueLines(characterSection, `character ${characterId}`);
		characterDefinitions.set(characterId, {
			title:nameValues.title || authoredCharacterName.trim(),
			description:nameValues.description || "",
			itemIds:parseOptions(nameValues.items || "").map(normalizeId),
			faceImageUrl:nameValues.faceImage?.trim() || null,
			isTitleKnown:(nameValues.isTitleKnown || '').toLowerCase() === 'true'
		});
	});
	return characterDefinitions;
}

export function parseItemDefinitions(itemsSection:string):Map<string, ItemDefinition> {
	const itemDefinitions = new Map<string, ItemDefinition>();
	const itemSectionsById = createNormalizedEntryMap(Object.entries(parseSections(itemsSection, 2)));
	Array.from(itemSectionsById.entries()).forEach(([itemId, itemSectionEntry]) => {
		const authoredItemName = itemSectionEntry.authoredName;
		const itemSection = itemSectionEntry.value;
		const nameValues = parseUniqueNameValueLines(itemSection, `item ${itemId}`);
		itemDefinitions.set(itemId, {
			title:nameValues.title || authoredItemName.trim(),
			description:nameValues.description || "",
			displayChar:nameValues.displayChar || authoredItemName.charAt(0) || "?"
		});
	});
	return itemDefinitions;
}

export function createKnownPopulationEntryIds(definitions:RoomPopulationDefinitions):Set<string> {
	return new Set([
		...definitions.characterDefinitions.keys(),
		...definitions.itemDefinitions.keys()
	]);
}

export function loadRoomPopulationFromRoomsSection(level:Level, roomsSection:string, definitions:RoomPopulationDefinitions) {
	_addCharactersAndRoomItemsFromSections(level, roomsSection, definitions.characterDefinitions, definitions.itemDefinitions);
}

export function loadCharacterInventoryItems(level:Level, definitions:RoomPopulationDefinitions) {
	_addInventoryItemsToCharacters(level, definitions.characterDefinitions, definitions.itemDefinitions);
}


function _findExistingItem(level:Level, itemId:string):Item|null {
	for (const room of level.rooms) {
		const roomItem = room.items.find(item => item.id === itemId) || null;
		if (roomItem) return roomItem;
	}
	for (const character of level.characters) {
		const characterItem = character.items.find(item => item.id === itemId) || null;
		if (characterItem) return characterItem;
	}
	return null;
}

function _assertCharacterIdIsUnique(level:Level, characterId:string, roomId:string, row:number, col:number) {
	if (level.characters.some(character => character.id === characterId)) {
		throw new Error(`duplicate character id '${characterId}' at row ${row + 1}, col ${col + 1} in room ${roomId}`);
	}
}

function _assertItemIdIsUnique(level:Level, itemId:string, context:string) {
	if (_findExistingItem(level, itemId)) throw new Error(`duplicate item id '${itemId}' ${context}`);
}


function _createItemFromDefinition(itemId:string, defaultTitleText:string, itemDefinitions:Map<string, ItemDefinition>, position:{x:number, y:number}, isDiscovered:boolean):Item {
	const itemDefinition = itemDefinitions.get(itemId);
	return {
		id:itemId,
		title:itemDefinition?.title || defaultTitleText,
		displayChar:itemDefinition?.displayChar || defaultTitleText.charAt(0) || "?",
		position:{ ...position },
		description:itemDefinition?.description || "",
		isDiscovered,
		isExamined:false
	};
}

function _findNearestUnclaimedWaypoint(room:Room, targetX:number, targetY:number, claimedWaypoints:Set<string>) {
	return findNearestWaypoint(room, targetX, targetY, waypoint => !claimedWaypoints.has(`${waypoint.position.x},${waypoint.position.y}`));
}

function _addCharacter(level:Level, room:Room, characterId:string, title:string, description:string, faceImageUrl:string|null, isTitleKnown:boolean, x:number, y:number) {
	const claimedWaypoints = new Set(level.characters.map(character => `${character.waypoint.position.x},${character.waypoint.position.y}`));
	const waypoint = _findNearestUnclaimedWaypoint(room, x, y, claimedWaypoints);
	const character:Character = {
		id: characterId,
		title,
		faceImageUrl,
		randomSalt:rand(),
		isTitleKnown,
		description,
		items: [],
		x:waypoint.position.x,
		y:waypoint.position.y,
		waypoint,
		itinerary:[],
		itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
	};
	level.characters.push(character);
}

function _addCharactersAndRoomItemsFromSections(level:Level, roomsSection:string,
	characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	const roomSectionsById = createNormalizedEntryMap(Object.entries(parseSections(roomsSection, 2)));

	Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
		const roomSection = roomSectionEntry.value;
		const room = findRoom(level.rooms, roomId);
		const gridLines = parseFirstFencedCodeBlockLines(roomSection);
		if (!gridLines.length) return;

		const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
		const gridHeight = gridLines.length;
		const roomNameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`);
		const roomLegend = Object.fromEntries(
			Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured')
		);

		findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId:authoredEntryText, row, col }) => {
			const entryId = normalizeId(authoredEntryText);
			const [x, y] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
			const characterDefinition = characterDefinitions.get(entryId);
			if (characterDefinition) {
				_assertCharacterIdIsUnique(level, entryId, roomId, row, col);
				_addCharacter(level, room, entryId, characterDefinition.title, characterDefinition.description, characterDefinition.faceImageUrl, characterDefinition.isTitleKnown, x, y);
				return;
			}
			if (itemDefinitions.has(entryId)) {
				_assertItemIdIsUnique(level, entryId, `at row ${row + 1}, col ${col + 1} in room ${roomId}`);
				_addItemToRoom(level, roomId, _createItemFromDefinition(entryId, authoredEntryText, itemDefinitions, { x, y }, false));
				return;
			}
		});
	});
}

function _addInventoryItemsToCharacters(level:Level, characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	level.characters.forEach(character => {
		const characterDefinition = characterDefinitions.get(character.id);
		if (!characterDefinition) return;
		_addItemsToCharacter(level, character.id, characterDefinition.itemIds.map(itemId => {
			_assertItemIdIsUnique(level, itemId, `in character ${character.id} inventory`);
			return _createItemFromDefinition(itemId, itemDefinitions.get(itemId)?.title || itemId, itemDefinitions, { x:0, y:0 }, true);
		}));
	});
}

function _addItemToRoom(level:Level, roomId:string, item:Omit<Item, 'isDiscovered'|'isExamined'>) {
	const room = findRoom(level.rooms, roomId);
	assertNonNullable(room);
	const { x, y } = item.position;
	const isInsideRoom = x >= room.rect.x && x <= room.rect.x + room.rect.width
		&& y >= room.rect.y && y <= room.rect.y + room.rect.height;
	if (!isInsideRoom) throw new Error(`item ${item.id} is outside room ${roomId}`);
	if (isPositionInRoomObstruction(room, x, y)) throw new Error(`item ${item.id} is inside an obstruction in room ${roomId}`);
	room.items.push({ ...item, isDiscovered:false, isExamined:false });
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
	assertNormalizedId(characterId, 'character');
	const character = level.characters.find(c => c.id === characterId);
	assertNonNullable(character, `character ${characterId} not found`);
	character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}
