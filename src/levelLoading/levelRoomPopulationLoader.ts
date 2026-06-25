/* This module groups character and item definition parsing with room and inventory population during level load.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { MarkdownLineError, parseFirstFencedCodeBlockLines, parseOptions, parseSectionEntriesWithLines, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { rand } from "@/common/randUtil";
import { calcItemCuboidHeightGame } from "@/game/itemSizeUtil";
import { roomWidthToColumnCount } from "@/game/roomGridUtil";
import { ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { calcScaledRoomGridPosition, findLegendTilesInGrid } from "./levelRoomLayoutLoader";
import { findRoom } from "../game/roomUtil";
import { findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET } from "../game/waypointUtil";
import Character, { type BodyOrientation, type FacingDirection } from "../game/types/Character";
import Item from "../game/types/Item";
import Level from "../game/types/Level";
import Position from "../game/types/Position";
import Room from "../game/types/Room";
import { assertNormalizedId, normalizeId } from "../game/idUtil";
import { getFaceImageAssetUrl, getItemImageAssetUrl } from "../game/imageUrlUtil";

type CharacterDefinition = {
	title:string,
	description:string,
	inventoryItems:Array<{ id:string, title:string }>,
	faceImageUrl:string|null,
	isVisible:boolean,
	isAlive:boolean,
	facingDirection:FacingDirection,
	bodyOrientation:BodyOrientation,
	isTitleKnown:boolean
};

type ItemDefinition = {
	title:string,
	description:string,
	imageUrl:string|null,
	isVisible:boolean,
	drawOffset:Position,
	stackOffset:Position
};

export type RoomPopulationDefinitions = {
	characterDefinitions:Map<string, CharacterDefinition>,
	itemDefinitions:Map<string, ItemDefinition>
};

const EXPECTED_ROOM_GRID_ROW_COUNT = 3;
const BACK_ROW_ITEM_DEPTH = ROOM_BACK_ROW_CENTER_Z;
const MIDDLE_ROW_ITEM_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;
const FRONT_ROW_ITEM_DEPTH = ROOM_FRONT_ROW_CENTER_Z;
const BACK_ROW_CHARACTER_DEPTH = ROOM_BACK_ROW_CENTER_Z;
const MIDDLE_ROW_CHARACTER_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;
const FRONT_ROW_CHARACTER_DEPTH = ROOM_FRONT_ROW_CENTER_Z;
const DEFAULT_POPULATION_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;
const ITEM_DEPTHS_BY_GRID_ROW = [BACK_ROW_ITEM_DEPTH, MIDDLE_ROW_ITEM_DEPTH, FRONT_ROW_ITEM_DEPTH] as const;
const CHARACTER_DEPTHS_BY_GRID_ROW = [BACK_ROW_CHARACTER_DEPTH, MIDDLE_ROW_CHARACTER_DEPTH, FRONT_ROW_CHARACTER_DEPTH] as const;

function _parseOptionalIsTitleKnownOrThrow(value:string|undefined, characterId:string):boolean {
	if (value === undefined) return false;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'true') return true;
	if (normalizedValue === 'false') return false;
	throw new Error(`character ${characterId} isTitleKnown must be true or false`);
}

function _parseOptionalIsAliveOrThrow(value:string|undefined, characterId:string):boolean {
	if (value === undefined) return true;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'true') return true;
	if (normalizedValue === 'false') return false;
	throw new Error(`character ${characterId} alive must be true or false`);
}

function _parseOptionalIsCharacterVisibleOrThrow(value:string|undefined, characterId:string):boolean {
	if (value === undefined) return true;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'true') return true;
	if (normalizedValue === 'false') return false;
	throw new Error(`character ${characterId} visible must be true or false`);
}

function _parseOptionalIsItemVisibleOrThrow(value:string|undefined, itemId:string):boolean {
	if (value === undefined) return true;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'true') return true;
	if (normalizedValue === 'false') return false;
	throw new Error(`item ${itemId} visible must be true or false`);
}

function _parseOptionalFacingDirectionOrThrow(value:string|undefined, characterId:string):FacingDirection {
	if (value === undefined) return 'right';
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'left' || normalizedValue === 'right') return normalizedValue;
	throw new Error(`character ${characterId} facing must be left or right`);
}

function _parseOptionalBodyOrientationOrThrow(value:string|undefined, characterId:string):BodyOrientation {
	if (value === undefined) return 'standing';
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === 'standing' || normalizedValue === 'sitting' || normalizedValue === 'kneeling' || normalizedValue === 'laying') return normalizedValue;
	throw new Error(`character ${characterId} orientation must be standing, sitting, kneeling, or laying`);
}

function _parseOptionalNumberOrThrow(value:string|undefined, propertyName:string, itemId:string):number {
	if (value === undefined) return 0;
	const parsedValue = Number(value.trim());
	if (Number.isFinite(parsedValue)) return parsedValue;
	throw new Error(`item ${itemId} ${propertyName} must be a number`);
}

function _createNormalizedSectionEntryMap(markdownText:string, indentLevel:number, firstLineNo:number):Map<string, { authoredName:string, value:string, lineNo:number }> {
	const normalizedEntries = new Map<string, { authoredName:string, value:string, lineNo:number }>();
	parseSectionEntriesWithLines(markdownText, indentLevel, false, firstLineNo).forEach(sectionEntry => {
		const normalizedName = normalizeId(sectionEntry.name);
		const existingEntry = normalizedEntries.get(normalizedName) || null;
		if (existingEntry) throw new MarkdownLineError(sectionEntry.lineNo,
			`duplicate normalized entry '${sectionEntry.name}' conflicts with '${existingEntry.authoredName}'`);
		normalizedEntries.set(normalizedName, {
			authoredName:sectionEntry.name,
			value:sectionEntry.value,
			lineNo:sectionEntry.lineNo
		});
	});
	return normalizedEntries;
}


export function parseCharacterDefinitions(charactersSection:string, firstLineNo:number = 1):Map<string, CharacterDefinition> {
	const characterDefinitions = new Map<string, CharacterDefinition>();
	const characterSectionsById = _createNormalizedSectionEntryMap(charactersSection, 2, firstLineNo);
	Array.from(characterSectionsById.entries()).forEach(([characterId, characterSectionEntry]) => {
		const authoredCharacterName = characterSectionEntry.authoredName;
		const characterSection = characterSectionEntry.value;
		const nameValues = parseUniqueNameValueLines(characterSection, `character ${characterId}`, false, characterSectionEntry.lineNo + 1);
		const inventoryItems = parseOptions(nameValues.items || "").map(itemText => ({
			id:normalizeId(itemText),
			title:itemText.trim()
		}));
		characterDefinitions.set(characterId, {
			title:nameValues.title || authoredCharacterName.trim(),
			description:nameValues.description || "",
			inventoryItems,
			faceImageUrl:nameValues.faceImage ? getFaceImageAssetUrl(nameValues.faceImage.trim()) : null,
			isVisible:_parseOptionalIsCharacterVisibleOrThrow(nameValues.visible, characterId),
			isAlive:_parseOptionalIsAliveOrThrow(nameValues.alive, characterId),
			facingDirection:_parseOptionalFacingDirectionOrThrow(nameValues.facing, characterId),
			bodyOrientation:_parseOptionalBodyOrientationOrThrow(nameValues.orientation, characterId),
			isTitleKnown:_parseOptionalIsTitleKnownOrThrow(nameValues.isTitleKnown, characterId)
		});
	});
	return characterDefinitions;
}

export function parseItemDefinitions(itemsSection:string, firstLineNo:number = 1):Map<string, ItemDefinition> {
	const itemDefinitions = new Map<string, ItemDefinition>();
	const itemSectionsById = _createNormalizedSectionEntryMap(itemsSection, 2, firstLineNo);
	Array.from(itemSectionsById.entries()).forEach(([itemId, itemSectionEntry]) => {
		const authoredItemName = itemSectionEntry.authoredName;
		const itemSection = itemSectionEntry.value;
		const nameValues = parseUniqueNameValueLines(itemSection, `item ${itemId}`, false, itemSectionEntry.lineNo + 1);
		itemDefinitions.set(itemId, {
			title:nameValues.title || authoredItemName.trim(),
			description:nameValues.description || "",
			imageUrl:nameValues.image ? getItemImageAssetUrl(nameValues.image.trim()) : null,
			isVisible:_parseOptionalIsItemVisibleOrThrow(nameValues.visible, itemId),
			drawOffset:{
				x:_parseOptionalNumberOrThrow(nameValues.drawOffsetX, 'drawOffsetX', itemId),
				y:_parseOptionalNumberOrThrow(nameValues.drawOffsetY, 'drawOffsetY', itemId),
				z:_parseOptionalNumberOrThrow(nameValues.drawOffsetZ, 'drawOffsetZ', itemId)
			},
			stackOffset:{
				x:_parseOptionalNumberOrThrow(nameValues.stackOffsetX, 'stackOffsetX', itemId),
				y:_parseOptionalNumberOrThrow(nameValues.stackOffsetY, 'stackOffsetY', itemId),
				z:_parseOptionalNumberOrThrow(nameValues.stackOffsetZ, 'stackOffsetZ', itemId)
			}
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

export function loadRoomPopulationFromRoomsSection(level:Level, roomsSection:string, definitions:RoomPopulationDefinitions,
	firstLineNo:number = 1) {
	_addCharactersAndRoomItemsFromSections(level, roomsSection, definitions.characterDefinitions, definitions.itemDefinitions, firstLineNo);
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
	return ITEM_DEPTHS_BY_GRID_ROW[row] ?? DEFAULT_POPULATION_DEPTH;
}

function _getCharacterDepthForGridRow(row:number):number {
	return CHARACTER_DEPTHS_BY_GRID_ROW[row] ?? DEFAULT_POPULATION_DEPTH;
}

function _parseRoomLegendPopulationEntries(authoredEntryText:string):Array<{ entryId:string, entryText:string }> {
	return parseOptions(authoredEntryText).map(entryText => ({
		entryId:normalizeId(entryText),
		entryText
	}));
}

function _createStackedRoomItemY(room:Room, stackIndex:number):number {
	return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET - stackIndex * calcItemCuboidHeightGame(room);
}

function _createCharacterFloorY(room:Room):number {
	return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

function _createRoomItemPosition(room:Room, targetX:number, depth:number, stackIndex:number) {
	const floorY = _createStackedRoomItemY(room, 0);
	const waypoint = findNearestWaypointToPosition(room, { x:targetX, y:floorY, z:depth });
	return {
		x:waypoint.position.x,
		y:_createStackedRoomItemY(room, stackIndex),
		z:waypoint.position.z
	};
}

function _createRoomCharacterPosition(room:Room, targetX:number, depth:number) {
	const floorY = _createCharacterFloorY(room);
	const waypoint = findNearestWaypointToPosition(room, { x:targetX, y:floorY, z:depth });
	return {
		x:waypoint.position.x,
		y:waypoint.position.y,
		z:waypoint.position.z
	};
}

function _createItemFromDefinition(itemId:string, defaultTitleText:string, itemDefinitions:Map<string, ItemDefinition>,
	position:{x:number, y:number}, depth:number, isDiscovered:boolean):Item {
	const itemDefinition = itemDefinitions.get(itemId);
	return {
		id:itemId,
		title:itemDefinition?.title || defaultTitleText,
		imageUrl:itemDefinition?.imageUrl || null,
		randomSalt:rand(),
		isVisible:itemDefinition?.isVisible ?? true,
		position:{ ...position, z:depth },
		drawOffset:itemDefinition?.drawOffset || { x:0, y:0, z:0 },
		stackOffset:itemDefinition?.stackOffset || { x:0, y:0, z:0 },
		description:itemDefinition?.description || "",
		isDiscovered
	};
}

function _addCharacter(level:Level, room:Room, characterId:string, title:string, description:string,
	faceImageUrl:string|null, isVisible:boolean, isAlive:boolean, facingDirection:FacingDirection, bodyOrientation:BodyOrientation,
	isTitleKnown:boolean, x:number, y:number, depth:number) {
	const claimedWaypoints = new Set(level.characters.map(character => `${character.waypoint.position.x},${character.waypoint.position.y},${character.waypoint.position.z}`));
	const waypoint = findNearestWaypointToPosition(room, { x, y, z:depth });
	assert(waypoint.position.x === x && waypoint.position.y === y && waypoint.position.z === depth,
		`initial character placement for ${characterId} must match an exact waypoint at (${x}, ${y}, ${depth}) in room ${room.id}`);
	assert(!claimedWaypoints.has(`${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`),
		`initial character placement waypoint for ${characterId} is already claimed at (${waypoint.position.x}, ${waypoint.position.y}, ${waypoint.position.z}) in room ${room.id}`);
	const character:Character = {
		id: characterId,
		title,
		faceImageUrl,
		randomSalt:rand(),
		isDiscovered:false,
		isVisible,
		isAlive,
		facingDirection,
		bodyOrientation,
		isTitleKnown,
		description,
		items: [],
		leftHandItem:null,
		rightHandItem:null,
		position:{ x, y, z:depth },
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

function _addLegendEntryPopulation(level:Level, room:Room, roomId:string, authoredEntryText:string, row:number, col:number,
	gridWidth:number, gridHeight:number, characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>) {
	const legendEntries = _parseRoomLegendPopulationEntries(authoredEntryText);
	const [x] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
	const characterDepth = _getCharacterDepthForGridRow(row);
	const itemDepth = _getItemDepthForGridRow(row);

	if (legendEntries.length === 1) {
		const [{ entryId, entryText }] = legendEntries;
		const characterDefinition = characterDefinitions.get(entryId);
		if (characterDefinition) {
			const characterPosition = _createRoomCharacterPosition(room, x, characterDepth);
			_assertCharacterIdIsUnique(level, entryId, roomId, row, col);
			_addCharacter(level, room, entryId, characterDefinition.title, characterDefinition.description,
				characterDefinition.faceImageUrl, characterDefinition.isVisible, characterDefinition.isAlive, characterDefinition.facingDirection,
				characterDefinition.bodyOrientation, characterDefinition.isTitleKnown,
				characterPosition.x, characterPosition.y, characterPosition.z);
			return;
		}
		if (itemDefinitions.has(entryId)) {
			_assertItemIdIsUnique(level, entryId, `at row ${row + 1}, col ${col + 1} in room ${roomId}`);
			const itemPosition = _createRoomItemPosition(room, x, itemDepth, 0);
			_addItemToRoom(level, roomId, _createItemFromDefinition(entryId, entryText, itemDefinitions,
				{ x:itemPosition.x, y:itemPosition.y }, itemPosition.z, false));
		}
		return;
	}

	const stackedCharacterEntries = legendEntries.filter(({ entryId }) => characterDefinitions.has(entryId));
	if (stackedCharacterEntries.length > 1) {
		throw new Error(`room legend entry '${authoredEntryText}' at row ${row + 1}, col ${col + 1} in room ${roomId} may include at most one character`);
	}
	const stackedCharacterEntry = stackedCharacterEntries[0] || null;
	if (stackedCharacterEntry && legendEntries[legendEntries.length - 1].entryId !== stackedCharacterEntry.entryId) {
		throw new Error(`room legend entry '${authoredEntryText}' at row ${row + 1}, col ${col + 1} in room ${roomId} must place any character last`);
	}

	const stackedItemEntries = stackedCharacterEntry ? legendEntries.slice(0, -1) : legendEntries;
	stackedItemEntries.forEach(({ entryId, entryText }, stackIndex) => {
		if (!itemDefinitions.has(entryId)) return;
		_assertItemIdIsUnique(level, entryId, `at row ${row + 1}, col ${col + 1} in room ${roomId}`);
		const itemPosition = _createRoomItemPosition(room, x, itemDepth, stackIndex);
		_addItemToRoom(level, roomId, _createItemFromDefinition(entryId, entryText, itemDefinitions,
			{ x:itemPosition.x, y:itemPosition.y }, itemPosition.z, false));
	});

	if (!stackedCharacterEntry) return;
	const characterDefinition = characterDefinitions.get(stackedCharacterEntry.entryId);
	assertNonNullable(characterDefinition);
	const anchorItemPosition = _createRoomItemPosition(room, x, itemDepth, 0);
	const characterPosition = _createRoomCharacterPosition(room, anchorItemPosition.x, characterDepth);
	_assertCharacterIdIsUnique(level, stackedCharacterEntry.entryId, roomId, row, col);
	_addCharacter(level, room, stackedCharacterEntry.entryId, characterDefinition.title, characterDefinition.description,
		characterDefinition.faceImageUrl, characterDefinition.isVisible, characterDefinition.isAlive, characterDefinition.facingDirection,
		characterDefinition.bodyOrientation, characterDefinition.isTitleKnown,
		characterPosition.x, characterPosition.y, characterPosition.z);
}

function _addCharactersAndRoomItemsFromSections(level:Level, roomsSection:string,
	characterDefinitions:Map<string, CharacterDefinition>, itemDefinitions:Map<string, ItemDefinition>, firstLineNo:number = 1) {
	const roomSectionsById = _createNormalizedSectionEntryMap(roomsSection, 2, firstLineNo);

	Array.from(roomSectionsById.entries()).forEach(([roomId, roomSectionEntry]) => {
		const roomSection = roomSectionEntry.value;
		const room = findRoom(level.rooms, roomId);
		const gridLines = parseFirstFencedCodeBlockLines(roomSection);
		if (!gridLines.length) return;
		_assertRoomGridMatchesExpectedDimensions(roomId, room, gridLines);

		const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
		const gridHeight = gridLines.length;
		const roomNameValues = parseUniqueNameValueLines(roomSection, `room ${roomId}`, false, roomSectionEntry.lineNo + 1);
		const roomLegend = Object.fromEntries(
			Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured')
		);

		findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId:authoredEntryText, row, col }) => {
			_addLegendEntryPopulation(level, room, roomId, authoredEntryText, row, col, gridWidth, gridHeight,
				characterDefinitions, itemDefinitions);
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
			return _createItemFromDefinition(item.id, item.title, itemDefinitions, { x:0, y:0 }, DEFAULT_POPULATION_DEPTH, false);
		}));
	});
}

function _addItemToRoom(level:Level, roomId:string, item:Omit<Item, 'isDiscovered'>) {
	const room = findRoom(level.rooms, roomId);
	assertNonNullable(room);
	const { x, y } = item.position;
	const isInsideRoom = x >= room.rect.x && x <= room.rect.x + room.rect.width
		&& y >= room.rect.y && y <= room.rect.y + room.rect.height;
	if (!isInsideRoom) throw new Error(`item ${item.id} is outside room ${roomId}`);
	room.items.push({ ...item, isDiscovered:false });
}

function _addItemsToCharacter(level:Level, characterId:string, items:Item[]) {
	assertNormalizedId(characterId, 'character');
	const character = level.characters.find(c => c.id === characterId);
	assertNonNullable(character, `character ${characterId} not found`);
	character.items.push(...items.map(item => ({ ...item, position:{ ...item.position } })));
}
