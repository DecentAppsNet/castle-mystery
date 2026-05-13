// Groups character and item definition parsing with room and inventory population during level load.

import { assertNonNullable } from "decent-portal";

import { parseFirstFencedCodeBlockLines, parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { baseUrl } from "@/common/urlUtil";
import { isPositionInRoomObstruction } from "./obstructionUtil";
import { calcScaledRoomGridPosition, findLegendTilesInGrid } from "./levelRoomLayoutLoader";
import { findNearestWaypoint, findRoom } from "./roomUtil";
import Character, { CharacterFaceImage } from "./types/Character";
import Item from "./types/Item";
import Level from "./types/Level";
import Room from "./types/Room";

type CharacterDefinition = {
	description:string,
	itemIds:string[],
	faceImageUrl:string|null
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
		characterDefinitions: _parseCharacterDefinitions(charactersSection),
		itemDefinitions: _parseItemDefinitions(itemsSection)
	};
}

function _parseCharacterDefinitions(charactersSection:string):Map<string, CharacterDefinition> {
	const characterDefinitions = new Map<string, CharacterDefinition>();
	const characterSections = parseSections(charactersSection, 2);
	Object.entries(characterSections).forEach(([characterId, characterSection]) => {
		const nameValues = parseNameValueLines(characterSection);
		characterDefinitions.set(characterId, {
			description:nameValues.description || "",
			itemIds:parseOptions(nameValues.items || ""),
			faceImageUrl:nameValues.faceImage?.trim() || null
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

export function createKnownPopulationEntryIds(definitions:RoomPopulationDefinitions):Set<string> {
	return new Set([
		...definitions.characterDefinitions.keys(),
		...definitions.itemDefinitions.keys()
	]);
}

export async function loadRoomPopulation(level:Level, roomsSection:string, definitions:RoomPopulationDefinitions, levelFilename:string) {
	const faceImageByCharacterId = await _loadFaceImagesByCharacterId(definitions.characterDefinitions, levelFilename);
	_addCharactersAndRoomItemsFromSections(level, roomsSection, definitions.characterDefinitions, faceImageByCharacterId, definitions.itemDefinitions);
	_addInventoryItemsToCharacters(level, definitions.characterDefinitions, definitions.itemDefinitions);
}

async function _loadImageFromUrl(imageUrl:string):Promise<CharacterFaceImage> {
	const response = await fetch(baseUrl(imageUrl));
	if (!response.ok) throw new Error(`unable to load face image ${imageUrl}`);
	const imageBlob = await response.blob();
	if (typeof createImageBitmap === 'function') return await createImageBitmap(imageBlob);
	if (typeof Image !== 'undefined') {
		const objectUrl = URL.createObjectURL(imageBlob);
		try {
			const image = new Image();
			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error(`unable to decode face image ${imageUrl}`));
				image.src = objectUrl;
			});
			return image;
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	}
	throw new Error(`no image loading API available for ${imageUrl}`);
}

async function _loadFaceImagesByCharacterId(characterDefinitions:Map<string, CharacterDefinition>, levelFilename:string):Promise<Map<string, CharacterFaceImage|null>> {
	const entries = await Promise.all(Array.from(characterDefinitions.entries()).map(async ([characterId, definition]) => {
		if (!definition.faceImageUrl) return [characterId, null] as const;
		return [characterId, await _loadImageFromUrl(definition.faceImageUrl)] as const;
	}));
	return new Map(entries);
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

function _addCharacter(level:Level, room:Room, characterId:string, description:string, faceImage:CharacterFaceImage|null, x:number, y:number) {
	const claimedWaypoints = new Set(level.characters.map(character => `${character.waypoint.position.x},${character.waypoint.position.y}`));
	const waypoint = _findNearestUnclaimedWaypoint(room, x, y, claimedWaypoints);
	const character:Character = {
		id: characterId,
		faceImage,
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
	characterDefinitions:Map<string, CharacterDefinition>, faceImageByCharacterId:Map<string, CharacterFaceImage|null>, itemDefinitions:Map<string, ItemDefinition>) {
	const roomSections = parseSections(roomsSection, 2);

	Object.entries(roomSections).forEach(([roomId, roomSection]) => {
		const room = findRoom(level.rooms, roomId);
		const gridLines = parseFirstFencedCodeBlockLines(roomSection);
		if (!gridLines.length) return;

		const gridWidth = gridLines.reduce((maxWidth, line) => Math.max(maxWidth, line.length), 0);
		const gridHeight = gridLines.length;
		const roomNameValues = parseNameValueLines(roomSection);
		const roomLegend = Object.fromEntries(
			Object.entries(roomNameValues).filter(([name]) => name !== 'exits' && name !== 'obscured')
		);

		findLegendTilesInGrid(gridLines, roomLegend).forEach(({ entryId, row, col }) => {
			const [x, y] = calcScaledRoomGridPosition(room, row, col, gridWidth, gridHeight);
			const characterDefinition = characterDefinitions.get(entryId);
			if (characterDefinition) {
				_addCharacter(level, room, entryId, characterDefinition.description, faceImageByCharacterId.get(entryId) || null, x, y);
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
