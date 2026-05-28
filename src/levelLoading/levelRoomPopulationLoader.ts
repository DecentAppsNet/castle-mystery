// Groups character and item definition parsing with room and inventory population during level load.

import { assertNonNullable } from "decent-portal";

import { parseFirstFencedCodeBlockLines, parseOptions, parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { rand } from "@/common/randUtil";
import { calcScaledRoomGridPosition, findLegendTilesInGrid } from "./levelRoomLayoutLoader";
import { findNearestWaypoint, findRoom, roomWidthToColumnCount } from "../game/roomUtil";
import Character from "../game/types/Character";
import Item from "../game/types/Item";
import Level from "../game/types/Level";
import Room from "../game/types/Room";
import { assertNormalizedId, createNormalizedEntryMap, normalizeId } from "../game/idUtil";

type CharacterDefinition = {
	title:string,
	description:string,
	inventoryItems:Array<{ id:string, title:string }>,
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

const EXPECTED_ROOM_GRID_ROW_COUNT = 3;
const ITEM_DEPTHS_BY_GRID_ROW = [0, 0.3333, 0.6667] as const;
const CHARACTER_DEPTHS_BY_GRID_ROW = [0.1667, 0.5, 0.8334] as const;

export function parseRoomPopulationDefinitions(charactersSection:string, itemsSection:string):RoomPopulationDefinitions {
	return {
		characterDefinitions: parseCharacterDefinitions(charactersSection),
		itemDefinitions: parseItemDefinitions(itemsSection)
	};
}

function _parseOptionalIsTitleKnownOrThrow(value:string|undefined, characterId:string):boolean {
	if (value === undefined) return false;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'true') return true;
	if (normalizedValue === 'false') return false;
	throw new Error(`character ${characterId} isTitleKnown must be true or false`);
}

export function parseCharacterDefinitions(charactersSection:string):Map<string, CharacterDefinition> {
	const characterDefinitions = new Map<string, CharacterDefinition>();
	const characterSectionsById = createNormalizedEntryMap(Object.entries(parseSections(charactersSection, 2)));
	Array.from(characterSectionsById.entries()).forEach(([characterId, characterSectionEntry]) => {
		const authoredCharacterName = characterSectionEntry.authoredName;
		const characterSection = characterSectionEntry.value;
		const nameValues = parseUniqueNameValueLines(characterSection, `character ${characterId}`);
		const inventoryItems = parseOptions(nameValues.items || "").map(itemText => ({
			id:normalizeId(itemText),
			title:itemText.trim()
		}));
		characterDefinitions.set(characterId, {
			title:nameValues.title || authoredCharacterName.trim(),
			description:nameValues.description || "",
			inventoryItems,
			faceImageUrl:nameValues.faceImage?.trim() || null,
			isTitleKnown:_parseOptionalIsTitleKnownOrThrow(nameValues.isTitleKnown, characterId)
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

export function tryResolveItemId(referenceText:string, itemDefinitions:Map<string, { title:string }>):string|null {
	const normalizedReference = normalizeId(referenceText);
	if (itemDefinitions.has(normalizedReference)) return normalizedReference;
	for (const [itemId, itemDefinition] of itemDefinitions.entries()) {
		if (normalizeId(itemDefinition.title) === normalizedReference) return itemId;
	}
	return null;
}

export function createKnownPopulationEntryIds(definitions:RoomPopulationDefinitions):Set<string> {
	return new Set([
		...definitions.characterDefinitions.keys(),
		...Array.from(definitions.characterDefinitions.values()).flatMap(characterDefinition => characterDefinition.inventoryItems.map(item => item.id)),
		...definitions.itemDefinitions.keys()
	]);
}

export function loadRoomPopulationFromRoomsSection(level:Level, roomsSection:string, definitions:RoomPopulationDefinitions) {
	_addCharactersAndRoomItemsFromSections(level, roomsSection, definitions.characterDefinitions, definitions.itemDefinitions);
}

export function loadCharacterInventoryItems(level:Level, definitions:RoomPopulationDefinitions) {
	_validateCharacterInventoryItems(definitions.characterDefinitions, definitions.itemDefinitions);
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

function _getItemDepthForGridRow(row:number):number {
	return ITEM_DEPTHS_BY_GRID_ROW[row] ?? 0.5;
}

function _getCharacterDepthForGridRow(row:number):number {
	return CHARACTER_DEPTHS_BY_GRID_ROW[row] ?? 0.5;
}

function _createItemFromDefinition(itemId:string, defaultTitleText:string, itemDefinitions:Map<string, ItemDefinition>,
	position:{x:number, y:number}, depth:number, isDiscovered:boolean):Item {
	const itemDefinition = itemDefinitions.get(itemId);
	return {
		id:itemId,
		title:itemDefinition?.title || defaultTitleText,
		displayChar:itemDefinition?.displayChar || defaultTitleText.charAt(0) || "?",
		position:{ ...position },
		depth,
		description:itemDefinition?.description || "",
		isDiscovered,
		isExamined:false
	};
}

function _findNearestUnclaimedWaypoint(room:Room, targetX:number, targetY:number, claimedWaypoints:Set<string>) {
	try {
		return findNearestWaypoint(room, targetX, targetY, waypoint => !claimedWaypoints.has(`${waypoint.position.x},${waypoint.position.y}`));
	} catch {
		return findNearestWaypoint(room, targetX, targetY);
	}
}

function _addCharacter(level:Level, room:Room, characterId:string, title:string, description:string,
	faceImageUrl:string|null, isTitleKnown:boolean, x:number, y:number, depth:number) {
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
		depth,
		waypoint,
		discoveredRoomIds:[],
		itinerary:[],
		itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
	};
	level.characters.push(character);
}

function _assertRoomGridMatchesExpectedDimensions(roomId:string, room:Room, gridLines:string[]) {
	const expectedColumnCount = roomWidthToColumnCount(room.rect.width);
	const actualRowCount = gridLines.length;
	const actualColumnCount = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
	const hasExpectedDimensions = actualRowCount === EXPECTED_ROOM_GRID_ROW_COUNT
		&& gridLines.every(line => line.length === expectedColumnCount);
	if (hasExpectedDimensions) return;
	throw new Error(
		`room ${roomId} fenced code grid is ${actualColumnCount} columns by ${actualRowCount} rows; use ${expectedColumnCount} columns by ${EXPECTED_ROOM_GRID_ROW_COUNT} rows`
	);
}

function _addCharactersAndRoomItemsFromSections(level:Level, roomsSection:string,
	characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	const roomSectionsById = createNormalizedEntryMap(Object.entries(parseSections(roomsSection, 2)));

	Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
		const roomSection = roomSectionEntry.value;
		const room = findRoom(level.rooms, roomId);
		const gridLines = parseFirstFencedCodeBlockLines(roomSection);
		if (!gridLines.length) return;
		_assertRoomGridMatchesExpectedDimensions(roomId, room, gridLines);

		const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
		const gridHeight = gridLines.length;
		const roomNameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`);
		const roomLegend = Object.fromEntries(
			Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured')
		);

		findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId:authoredEntryText, row, col }) => {
			const entryId = normalizeId(authoredEntryText);
			const [x, y] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
			const characterDepth = _getCharacterDepthForGridRow(row);
			const itemDepth = _getItemDepthForGridRow(row);
			const characterDefinition = characterDefinitions.get(entryId);
			if (characterDefinition) {
				_assertCharacterIdIsUnique(level, entryId, roomId, row, col);
				_addCharacter(level, room, entryId, characterDefinition.title, characterDefinition.description,
					characterDefinition.faceImageUrl, characterDefinition.isTitleKnown, x, y, characterDepth);
				return;
			}
			if (itemDefinitions.has(entryId)) {
				_assertItemIdIsUnique(level, entryId, `at row ${row + 1}, col ${col + 1} in room ${roomId}`);
				_addItemToRoom(level, roomId, _createItemFromDefinition(entryId, authoredEntryText, itemDefinitions, { x, y }, itemDepth, false));
				return;
			}
		});
	});
}

function _validateCharacterInventoryItems(characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	Array.from(characterDefinitions.entries()).forEach(([characterId, characterDefinition]) => {
		characterDefinition.inventoryItems.forEach(item => {
			if (itemDefinitions.has(item.id)) return;
			throw new Error(`character ${characterId} inventory item '${item.title}' does not match any item in the items section`);
		});
	});
}

function _addInventoryItemsToCharacters(level:Level, characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	level.characters.forEach(character => {
		const characterDefinition = characterDefinitions.get(character.id);
		if (!characterDefinition) return;
		_addItemsToCharacter(level, character.id, characterDefinition.inventoryItems.map(item => {
			_assertItemIdIsUnique(level, item.id, `in character ${character.id} inventory`);
			return _createItemFromDefinition(item.id, item.title, itemDefinitions, { x:0, y:0 }, 0.5, true);
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
	room.items.push({ ...item, isDiscovered:false, isExamined:false });
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
	assertNormalizedId(characterId, 'character');
	const character = level.characters.find(c => c.id === characterId);
	assertNonNullable(character, `character ${characterId} not found`);
	character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}
