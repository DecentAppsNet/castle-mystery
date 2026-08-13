import { describe, it, expect } from 'vitest';
import groundFloorRoomUnknownText from './fixtures/rooms/rooms-ground-floor-room-unknown.md?raw';
import exitMissingLeftParenText from './fixtures/rooms/rooms-exit-missing-left-paren.md?raw';
import exitMissingRightParenText from './fixtures/rooms/rooms-exit-missing-right-paren.md?raw';
import exitMissingRoomIdText from './fixtures/rooms/rooms-exit-missing-room-id.md?raw';
import exitNotHorizAdjacentText from './fixtures/rooms/rooms-exit-not-horiz-adjacent.md?raw';
import exitRightBeforeLeftParenText from './fixtures/rooms/rooms-exit-right-before-left-paren.md?raw';
import exitUnknownRoomText from './fixtures/rooms/rooms-exit-unknown-room.md?raw';
import mapDuplicateLegendIdText from './fixtures/rooms/rooms-map-duplicate-legend-id.md?raw';
import mapMissingLegendEntryText from './fixtures/rooms/rooms-map-missing-legend-entry.md?raw';
import mapNonRectRoomText from './fixtures/rooms/rooms-map-non-rect-room.md?raw';
import mapRoomMissingRoomSectionText from './fixtures/rooms/rooms-map-room-missing-room-section.md?raw';
import mapUnusedLegendEntryText from './fixtures/rooms/rooms-map-unused-legend-entry.md?raw';
import outsideBelowGroundFloorText from './fixtures/rooms/rooms-outside-below-ground-floor.md?raw';
import roomItemMissingDefinitionText from './fixtures/rooms/rooms-room-item-missing-definition.md?raw';
import roomLegendDuplicateIdText from './fixtures/rooms/rooms-room-legend-duplicate-id.md?raw';
import roomLegendMissingEntryText from './fixtures/rooms/rooms-room-legend-missing-entry.md?raw';
import roomLegendUnusedEntryText from './fixtures/rooms/rooms-room-legend-unused-entry.md?raw';
import roomStylesDuplicateHeadingText from './fixtures/rooms/room-styles-duplicate-heading.md?raw';
import roomStylesNormalizationDuplicateText from './fixtures/rooms/room-styles-normalization-duplicate.md?raw';
import roomsSectionDuplicateHeadingText from './fixtures/rooms/rooms-section-duplicate-heading.md?raw';
import roomsSectionNormalizationDuplicateText from './fixtures/rooms/rooms-section-normalization-duplicate.md?raw';
import successMinimalText from './fixtures/rooms/rooms-success-minimal.md?raw';
import successPopulatedText from './fixtures/rooms/rooms-success-populated.md?raw';
import textureBadFormatText from './fixtures/rooms/rooms-texture-bad-format.md?raw';
import textureInvalidAlphaText from './fixtures/rooms/rooms-texture-invalid-alpha.md?raw';
import textureInvalidPositiveIntegerText from './fixtures/rooms/rooms-texture-invalid-positive-integer.md?raw';
import { loadLevelForTest } from './testLevelUtil';

describe('loading levels - rooms', () => {
	it('loads a minimal room layout into the returned level', () => {
		const { level, errors } = loadLevelForTest(successMinimalText, 'rooms-success-minimal.md');

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
		const { level, errors } = loadLevelForTest(successPopulatedText, 'rooms-success-populated.md');

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
		const { level, errors } = loadLevelForTest(mapDuplicateLegendIdText, 'rooms-map-duplicate-legend-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Duplicate ID "hall" used for multiple legend entries.');
	});

	it('fails if the map grid contains a tile with no matching legend entry', () => {
		const { level, errors } = loadLevelForTest(mapMissingLegendEntryText, 'rooms-map-missing-legend-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('legend tile "A" doesn\'t have corresponding legend entry');
	});

	it('fails if the map legend contains an entry that is not used in the grid', () => {
		const { level, errors } = loadLevelForTest(mapUnusedLegendEntryText, 'rooms-map-unused-legend-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Legend tile "C" is not present in grid.');
	});

	it('fails if map tiles for a room cover a non-rectangular area', () => {
		const { level, errors } = loadLevelForTest(mapNonRectRoomText, 'rooms-map-non-rect-room.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Map tiles for ${roomId} cover a non-rect area.');
	});

	it('fails if a map legend room does not have a matching rooms section definition', () => {
		const { level, errors } = loadLevelForTest(mapRoomMissingRoomSectionText, 'rooms-map-room-missing-room-section.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Map legend room "hall" does not have corresponding definition in "rooms" section');
	});

	it('fails if the rooms section contains duplicate subsections with the same heading text', () => {
		const { level, errors } = loadLevelForTest(roomsSectionDuplicateHeadingText, 'rooms-section-duplicate-heading.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain("duplicate section 'Hall'");
	});

	it('fails if the rooms section contains different headings that normalize to the same room ID', () => {
		const { level, errors } = loadLevelForTest(roomsSectionNormalizationDuplicateText, 'rooms-section-normalization-duplicate.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('After normalization');
	});

	it('fails if the room styles section contains duplicate subsections with the same heading text', () => {
		const { level, errors } = loadLevelForTest(roomStylesDuplicateHeadingText, 'room-styles-duplicate-heading.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain("duplicate section 'Stone'");
	});

	it('fails if the room styles section contains different headings that normalize to the same style ID', () => {
		const { level, errors } = loadLevelForTest(roomStylesNormalizationDuplicateText, 'room-styles-normalization-duplicate.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('After normalization');
	});

	it('fails if a room legend uses the same ID for multiple tile entries', () => {
		const { level, errors } = loadLevelForTest(roomLegendDuplicateIdText, 'rooms-room-legend-duplicate-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Duplicate ID "key" used for multiple legend entries.');
	});

	it('fails if a room grid contains a tile with no matching legend entry', () => {
		const { level, errors } = loadLevelForTest(roomLegendMissingEntryText, 'rooms-room-legend-missing-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('legend tile "K" doesn\'t have corresponding legend entry');
	});

	it('fails if a room legend contains an entry that is not used in the room grid', () => {
		const { level, errors } = loadLevelForTest(roomLegendUnusedEntryText, 'rooms-room-legend-unused-entry.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Legend tile "K" is not present in grid.');
	});

	it('fails if a room references an item that is not defined in the items section', () => {
		const { level, errors } = loadLevelForTest(roomItemMissingDefinitionText, 'rooms-room-item-missing-definition.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"key" referenced in legend for "hall" room does not have a definition');
	});

	it('fails if an exit contains a right parenthesis before a left parenthesis', () => {
		const { level, errors } = loadLevelForTest(exitRightBeforeLeftParenText, 'rooms-exit-right-before-left-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('")" preceding "(" with no matched "(". Fix parentheses.');
	});

	it('fails if an exit modifier is present but the other room ID is missing', () => {
		const { level, errors } = loadLevelForTest(exitMissingRoomIdText, 'rooms-exit-missing-room-id.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Expected a room ID.');
	});

	it('fails if an exit modifier is missing a closing parenthesis', () => {
		const { level, errors } = loadLevelForTest(exitMissingRightParenText, 'rooms-exit-missing-right-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Missing ")" to enclose modifier.');
	});

	it('fails if an exit modifier is missing an opening parenthesis', () => {
		const { level, errors } = loadLevelForTest(exitMissingLeftParenText, 'rooms-exit-missing-left-paren.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('Missing "(" to enclose modifier.');
	});

	it('fails if an exit references a room that is not defined', () => {
		const { level, errors } = loadLevelForTest(exitUnknownRoomText, 'rooms-exit-unknown-room.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"attic" room ID must match a defined room.');
	});

	it('fails if an exit references a room that is not horizontally adjacent', () => {
		const { level, errors } = loadLevelForTest(exitNotHorizAdjacentText, 'rooms-exit-not-horiz-adjacent.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"hall" and "closet" are not horizontally adjacent.');
	});

	it('fails if groundFloorRoom does not match a defined room', () => {
		const { level, errors } = loadLevelForTest(groundFloorRoomUnknownText, 'rooms-ground-floor-room-unknown.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"Attic" does not match a defined room.');
	});

	it('fails if an outside room is below the configured ground floor room', () => {
		const { level, errors } = loadLevelForTest(outsideBelowGroundFloorText, 'rooms-outside-below-ground-floor.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('outside room "Courtyard" is below the ground floor room.');
	});

	it('fails if a room texture specifies an invalid alpha mode', () => {
		const { level, errors } = loadLevelForTest(textureInvalidAlphaText, 'rooms-texture-invalid-alpha.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('did not equal "composite" or "punch"');
	});

	it('fails if a room texture specifies a non-positive repeat count', () => {
		const { level, errors } = loadLevelForTest(textureInvalidPositiveIntegerText, 'rooms-texture-invalid-positive-integer.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('"0" is not a positive integer.');
	});

	it('fails if a room texture is not written in the expected syntax', () => {
		const { level, errors } = loadLevelForTest(textureBadFormatText, 'rooms-texture-bad-format.md');

		expect(level).toBeNull();
		expect(errors.describeErrors()).toContain('backWallTexture must be in the form');
	});
});
