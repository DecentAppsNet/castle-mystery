import { describe, expect, it } from 'vitest';

import { createInitialTimelineSnapshot, updateTimelineSnapshotActiveContext } from '@/game/timeline';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultRoomKeyframe } from '@/game/types/RoomKeyframe';
import Timeline from '@/game/types/Timeline';
import TimelineKeyframe from '@/game/types/TimelineKeyframe';

const ROOMS = [
	{ ...createDefaultRoom(), id:'left', rect:{ x:0, y:0, width:10, height:10 } },
	{ ...createDefaultRoom(), id:'right', rect:{ x:10, y:0, width:10, height:10 } }
];
const CHARACTERS = [
	{ ...createDefaultCharacter(), id:'walker', skinId:'walker-default' },
	{ ...createDefaultCharacter(), id:'sitter', skinId:'sitter-default' }
];

function _createKeyframe(time:number, walkerX:number, sitterX = 15):TimelineKeyframe {
	return {
		time,
		characters:[
			{ ...createDefaultCharacterKeyframe(), skinId:'walker-default', position:{ x:walkerX, y:5, z:0 } },
			{ ...createDefaultCharacterKeyframe(), skinId:'sitter-default', position:{ x:sitterX, y:5, z:0 } }
		],
		rooms:[createDefaultRoomKeyframe(), createDefaultRoomKeyframe()]
	};
}

function _createTimeline(keyframes:TimelineKeyframe[]):Timeline {
	return {
		characterIds:['walker', 'sitter'],
		characterIdToI:{ walker:0, sitter:1 },
		roomIdToI:{ left:0, right:1 },
		keyframes
	};
}

function _createSnapshot(keyframes:TimelineKeyframe[], time:number) {
	return createInitialTimelineSnapshot(CHARACTERS, ROOMS, _createTimeline(keyframes), 'walker', time, new Set());
}

describe('snapshotUtil', () => {
	describe('movement classification', () => {
		it('classifies moving and stationary characters independently', () => {
			const snapshot = _createSnapshot([
				_createKeyframe(1000, 2),
				_createKeyframe(2000, 2),
				_createKeyframe(3000, 8)
			], 2500);

			expect(snapshot.movingCharacterIds).toEqual(new Set(['walker']));
		});

		it('always classifies the first source keyframe as resting', () => {
			const snapshot = _createSnapshot([_createKeyframe(1000, 2), _createKeyframe(2000, 8)], 1500);

			expect(snapshot.movingCharacterIds).toEqual(new Set());
		});

		it('classifies a character as stopped when there is no successor', () => {
			const snapshot = _createSnapshot([_createKeyframe(1000, 2), _createKeyframe(2000, 8)], 2000);

			expect(snapshot.movingCharacterIds).toEqual(new Set());
		});

		it('classifies an exact intermediate waypoint as moving when its successor position differs', () => {
			const snapshot = _createSnapshot([
				_createKeyframe(1000, 2),
				_createKeyframe(2000, 5),
				_createKeyframe(3000, 8)
			], 2000);

			expect(snapshot.movingCharacterIds).toEqual(new Set(['walker']));
		});

		it('classifies an exact destination as stopped when its successor position is unchanged', () => {
			const snapshot = _createSnapshot([
				_createKeyframe(1000, 2),
				_createKeyframe(2000, 8),
				_createKeyframe(3000, 8)
			], 2000);

			expect(snapshot.movingCharacterIds).toEqual(new Set());
		});
	});

	it('preserves movement classification when updating active context', () => {
		const snapshot = _createSnapshot([
			_createKeyframe(1000, 2),
			_createKeyframe(2000, 2),
			_createKeyframe(3000, 8)
		], 2500);
		const movingCharacterIds = snapshot.movingCharacterIds;

		updateTimelineSnapshotActiveContext(snapshot, 'sitter');

		expect(snapshot.activeCharacter.id).toBe('sitter');
		expect(snapshot.activeRoom.id).toBe('right');
		expect(snapshot.movingCharacterIds).toBe(movingCharacterIds);
	});
});