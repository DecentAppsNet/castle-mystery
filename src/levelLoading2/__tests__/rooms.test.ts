import { describe, it, expect } from 'vitest';
import ErrorCollector from '../errorCollection/ErrorCollector';
import SourceLineMap from '../importing/types/SourceLineMap';
import { loadLevelFromText } from '../loadLevelUtil';
import groundFloorRoomUnknownText from './fixtures/rooms-ground-floor-room-unknown.md?raw';
import exitMissingLeftParenText from './fixtures/rooms-exit-missing-left-paren.md?raw';
import exitMissingRightParenText from './fixtures/rooms-exit-missing-right-paren.md?raw';
import exitMissingRoomIdText from './fixtures/rooms-exit-missing-room-id.md?raw';
import exitNotHorizAdjacentText from './fixtures/rooms-exit-not-horiz-adjacent.md?raw';
import exitRightBeforeLeftParenText from './fixtures/rooms-exit-right-before-left-paren.md?raw';
import exitUnknownRoomText from './fixtures/rooms-exit-unknown-room.md?raw';
import mapDuplicateLegendIdText from './fixtures/rooms-map-duplicate-legend-id.md?raw';
import mapMissingLegendEntryText from './fixtures/rooms-map-missing-legend-entry.md?raw';
import mapNonRectRoomText from './fixtures/rooms-map-non-rect-room.md?raw';
import mapRoomMissingRoomSectionText from './fixtures/rooms-map-room-missing-room-section.md?raw';
import mapUnusedLegendEntryText from './fixtures/rooms-map-unused-legend-entry.md?raw';
import outsideBelowGroundFloorText from './fixtures/rooms-outside-below-ground-floor.md?raw';
import roomItemMissingDefinitionText from './fixtures/rooms-room-item-missing-definition.md?raw';
import roomLegendDuplicateIdText from './fixtures/rooms-room-legend-duplicate-id.md?raw';
import roomLegendMissingEntryText from './fixtures/rooms-room-legend-missing-entry.md?raw';
import roomLegendUnusedEntryText from './fixtures/rooms-room-legend-unused-entry.md?raw';
import roomStylesDuplicateHeadingText from './fixtures/room-styles-duplicate-heading.md?raw';
import roomStylesNormalizationDuplicateText from './fixtures/room-styles-normalization-duplicate.md?raw';
import roomsSectionDuplicateHeadingText from './fixtures/rooms-section-duplicate-heading.md?raw';
import roomsSectionNormalizationDuplicateText from './fixtures/rooms-section-normalization-duplicate.md?raw';
import successMinimalText from './fixtures/rooms-success-minimal.md?raw';
import successPopulatedText from './fixtures/rooms-success-populated.md?raw';
import textureBadFormatText from './fixtures/rooms-texture-bad-format.md?raw';
import textureInvalidAlphaText from './fixtures/rooms-texture-invalid-alpha.md?raw';
import textureInvalidPositiveIntegerText from './fixtures/rooms-texture-invalid-positive-integer.md?raw';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
	return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

function _loadLevel(text:string, filename:string) {
	const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
	const level = loadLevelFromText(text, errors);
	return { level, errors };
}

describe('loading levels - rooms', () => {
	it('loads a minimal room layout into the returned level', () => {
		const { level, errors } = _loadLevel(successMinimalText, 'rooms-success-minimal.md');

		expect(errors.describeErrors()).toBe('');
		expect(level).not.toBeNull();
		expect(level?.groundFloorY).toBe(20);
		expect(level?.rooms).toHaveLength(1);
		expect(level?.rooms[0]?.id).toBe('hall');
		expect(level?.rooms[0]?.title).toBe('Hall');
		expect(level?.rooms[0]?.rect).toEqual({ x:0, y:0, width:20, height:20 });
		expect(level?.rooms[0]?.items).toEqual([]);
		expect(level?.rooms[0]?.exits).toEqual([]);
	});

	it('loads room metadata, merged items, exits, textures, and ground floor into the returned level', () => {
		const { level, errors } = _loadLevel(successPopulatedText, 'rooms-success-populated.md');

		expect(errors.describeErrors()).toBe('');
		expect(level).not.toBeNull();
		expect(level?.groundFloorY).toBe(20);
		expect(level?.rooms).toHaveLength(2);

    // Closet is first according to right-to-left draw order
    expect(level?.rooms[0]?.id).toBe('closet');
		expect(level?.rooms[0]?.isOutside).toBe(true);
		expect(level?.rooms[0]?.exits).toHaveLength(1);

		expect(level?.rooms[1]?.id).toBe('hall');
		expect(level?.rooms[1]?.title).toBe('Great Hall');
		expect(level?.rooms[1]?.isObscured).toBe(true);
		expect(level?.rooms[1]?.items).toHaveLength(1);
		expect(level?.rooms[1]?.items[0]?.id).toBe('brass key');
		expect(level?.rooms[1]?.items[0]?.title).toBe('Master Key');
		expect(level?.rooms[1]?.backWallTexture?.operations[0]).toMatchObject({
			type:'image',
			imageUrl:'/assets/room/stone.png',
			alphaMode:'punch'
		});
		expect(level?.rooms[1]?.exits).toHaveLength(1);
		expect(level?.rooms[1]?.exits[0]).toMatchObject({
			room1Id:'hall',
			room2Id:'closet',
			exitType:'lockableDoor',
			exitStatus:'locked',
			lockableFromRoom1With:'*'
		});
	});

	it('fails if the map legend uses the same room ID for multiple tile entries', () => {
		const { level, errors } = _loadLevel(mapDuplicateLegendIdText, 'rooms-map-duplicate-legend-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Duplicate ID "hall" used for multiple legend entries.');
	});

	it('fails if the map grid contains a tile with no matching legend entry', () => {
		const { level, errors } = _loadLevel(mapMissingLegendEntryText, 'rooms-map-missing-legend-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('legend tile "A" doesn\'t have corresponding legend entry');
	});

	it('fails if the map legend contains an entry that is not used in the grid', () => {
		const { level, errors } = _loadLevel(mapUnusedLegendEntryText, 'rooms-map-unused-legend-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Legend tile "C" is not present in grid.');
	});

	it('fails if map tiles for a room cover a non-rectangular area', () => {
		const { level, errors } = _loadLevel(mapNonRectRoomText, 'rooms-map-non-rect-room.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Map tiles for ${roomId} cover a non-rect area.');
	});

	it('fails if a map legend room does not have a matching rooms section definition', () => {
		const { level, errors } = _loadLevel(mapRoomMissingRoomSectionText, 'rooms-map-room-missing-room-section.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Map legend room "hall" does not have corresponding definition in "rooms" section');
	});

	it('fails if the rooms section contains duplicate subsections with the same heading text', () => {
		const { level, errors } = _loadLevel(roomsSectionDuplicateHeadingText, 'rooms-section-duplicate-heading.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain("duplicate section 'Hall'");
	});

	it('fails if the rooms section contains different headings that normalize to the same room ID', () => {
		const { level, errors } = _loadLevel(roomsSectionNormalizationDuplicateText, 'rooms-section-normalization-duplicate.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('After normalization');
	});

	it('fails if the room styles section contains duplicate subsections with the same heading text', () => {
		const { level, errors } = _loadLevel(roomStylesDuplicateHeadingText, 'room-styles-duplicate-heading.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain("duplicate section 'Stone'");
	});

	it('fails if the room styles section contains different headings that normalize to the same style ID', () => {
		const { level, errors } = _loadLevel(roomStylesNormalizationDuplicateText, 'room-styles-normalization-duplicate.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('After normalization');
	});

	it('fails if a room legend uses the same ID for multiple tile entries', () => {
		const { level, errors } = _loadLevel(roomLegendDuplicateIdText, 'rooms-room-legend-duplicate-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Duplicate ID "key" used for multiple legend entries.');
	});

	it('fails if a room grid contains a tile with no matching legend entry', () => {
		const { level, errors } = _loadLevel(roomLegendMissingEntryText, 'rooms-room-legend-missing-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('legend tile "A" doesn\'t have corresponding legend entry');
	});

	it('fails if a room legend contains an entry that is not used in the room grid', () => {
		const { level, errors } = _loadLevel(roomLegendUnusedEntryText, 'rooms-room-legend-unused-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Legend tile "A" is not present in grid.');
	});

	it('fails if a room references an item that is not defined in the items section', () => {
		const { level, errors } = _loadLevel(roomItemMissingDefinitionText, 'rooms-room-item-missing-definition.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Could not find item in Items section matching "key".');
	});

	it('fails if an exit contains a right parenthesis before a left parenthesis', () => {
		const { level, errors } = _loadLevel(exitRightBeforeLeftParenText, 'rooms-exit-right-before-left-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('")" preceding "(" with no matched "(". Fix parentheses.');
	});

	it('fails if an exit modifier is present but the other room ID is missing', () => {
		const { level, errors } = _loadLevel(exitMissingRoomIdText, 'rooms-exit-missing-room-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Expected a room ID.');
	});

	it('fails if an exit modifier is missing a closing parenthesis', () => {
		const { level, errors } = _loadLevel(exitMissingRightParenText, 'rooms-exit-missing-right-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Missing ")" to enclose modifier.');
	});

	it('fails if an exit modifier is missing an opening parenthesis', () => {
		const { level, errors } = _loadLevel(exitMissingLeftParenText, 'rooms-exit-missing-left-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Missing "(" to enclose modifier.');
	});

	it('fails if an exit references a room that is not defined', () => {
		const { level, errors } = _loadLevel(exitUnknownRoomText, 'rooms-exit-unknown-room.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"attic" room ID must match a defined room.');
	});

	it('fails if an exit references a room that is not horizontally adjacent', () => {
		const { level, errors } = _loadLevel(exitNotHorizAdjacentText, 'rooms-exit-not-horiz-adjacent.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"hall" and "closet" are not horizontally adjacent.');
	});

	it('fails if groundFloorRoom does not match a defined room', () => {
		const { level, errors } = _loadLevel(groundFloorRoomUnknownText, 'rooms-ground-floor-room-unknown.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"Attic" does not match a defined room.');
	});

	it('fails if an outside room is below the configured ground floor room', () => {
		const { level, errors } = _loadLevel(outsideBelowGroundFloorText, 'rooms-outside-below-ground-floor.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('outside room "Courtyard" is below the ground floor room.');
	});

	it('fails if a room texture specifies an invalid alpha mode', () => {
		const { level, errors } = _loadLevel(textureInvalidAlphaText, 'rooms-texture-invalid-alpha.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('did not equal "composite" or "punch"');
	});

	it('fails if a room texture specifies a non-positive repeat count', () => {
		const { level, errors } = _loadLevel(textureInvalidPositiveIntegerText, 'rooms-texture-invalid-positive-integer.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"0" is not a positive integer.');
	});

	it('fails if a room texture is not written in the expected syntax', () => {
		const { level, errors } = _loadLevel(textureBadFormatText, 'rooms-texture-bad-format.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('backWallTexture must be in the form');
	});
});
