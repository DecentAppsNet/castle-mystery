import { describe, expect, it } from 'vitest';

import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoomKeyframe } from '@/game/types/RoomKeyframe';
import TimelineKeyframe from '@/game/types/TimelineKeyframe';
import { createCharacterKeyframeAtTime, createKeyframeAtTime, findCharacterPositionAtTime, findKeyframeForTime } from '@/game/timeline';

function _createKeyframe(time:number, positions:Array<{ x:number, y:number, z:number }>):TimelineKeyframe {
	return {
		time,
		characters:positions.map(position => ({
			...createDefaultCharacterKeyframe(),
			position
		})),
		rooms:[createDefaultRoomKeyframe()]
	};
}

describe('retrievalUtil', () => {
	describe('createKeyframetAtTime()', () => {
		it('returns a snapshot with interpolated positions for characters that moved by the requested time', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:0, y:0, z:0 }, { x:20, y:20, z:20 }]),
				_createKeyframe(2000, [{ x:10, y:10, z:10 }, { x:20, y:20, z:20 }])
			];

			const snapshot = createKeyframeAtTime(keyframes, 1500);

			expect(snapshot.characters[0]?.position).toEqual({ x:5, y:5, z:5 });
			expect(snapshot.characters[1]?.position).toEqual({ x:20, y:20, z:20 });
			expect(keyframes[0]?.characters[0]?.position).toEqual({ x:0, y:0, z:0 });
		});

		it('returns the last keyframe when the requested time is past the last keyframe', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const lastKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const keyframes = [firstKeyframe, lastKeyframe];

			const snapshot = createKeyframeAtTime(keyframes, 5000);

			expect(snapshot).toEqual({...lastKeyframe, time:5000});
		});

		it('returns the last keyframe when the requested time is on the last keyframe', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const lastKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const keyframes = [firstKeyframe, lastKeyframe];

			const snapshot = createKeyframeAtTime(keyframes, 2000);

			expect(snapshot).toEqual(lastKeyframe);
		});

		it('interpolates only the characters that moved when the requested time falls between keyframes', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:3, y:4, z:5 }, { x:0, y:0, z:0 }]),
				_createKeyframe(2000, [{ x:3, y:4, z:5 }, { x:10, y:10, z:10 }])
			];

			const snapshot = createKeyframeAtTime(keyframes, 1500);

			expect(snapshot).not.toBe(keyframes[0]);
			expect(snapshot.characters[0]?.position).toEqual({ x:3, y:4, z:5 });
			expect(snapshot.characters[1]?.position).toEqual({ x:5, y:5, z:5 });
			expect(snapshot.characters[1]?.position).not.toBe(keyframes[0].characters[1].position);
		});

    it('does not interpolate when no characters moved between keyframes', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:3, y:4, z:5 }, { x:0, y:0, z:10 }]),
				_createKeyframe(2000, [{ x:3, y:4, z:5 }, { x:0, y:0, z:10 }])
			];

			const snapshot = createKeyframeAtTime(keyframes, 1500);

			expect(snapshot).toEqual({...keyframes[0], time:1500});
			expect(snapshot.characters[0]?.position).toEqual({ x:3, y:4, z:5 });
			expect(snapshot.characters[1]?.position).toEqual({ x:0, y:0, z:10 });
		});
	});

	describe('createCharacterKeyframeAtTime()', () => {
		it('returns an interpolated character keyframe for the requested character at the requested time', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:0, y:0, z:0 }]),
				_createKeyframe(2000, [{ x:10, y:10, z:10 }])
			];

			const snapshot = createCharacterKeyframeAtTime(keyframes, 0, 1500);

			expect(snapshot.position).toEqual({ x:5, y:5, z:5 });
			expect(keyframes[0]?.characters[0]?.position).toEqual({ x:0, y:0, z:0 });
		});

		it('returns the last character keyframe when the requested time is past the last keyframe', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:0, y:0, z:0 }]),
				_createKeyframe(2000, [{ x:10, y:10, z:10 }])
			];

			const snapshot = createCharacterKeyframeAtTime(keyframes, 0, 5000);

			expect(snapshot).toBe(keyframes[1].characters[0]);
			expect(snapshot.position).toEqual({ x:10, y:10, z:10 });
		});

		it('returns the last character keyframe when the requested time is on the last keyframe', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:0, y:0, z:0 }]),
				_createKeyframe(2000, [{ x:10, y:10, z:10 }])
			];

			const snapshot = createCharacterKeyframeAtTime(keyframes, 0, 2000);

			expect(snapshot).toBe(keyframes[1].characters[0]);
			expect(snapshot.position).toEqual({ x:10, y:10, z:10 });
		});

		it('returns the earlier character keyframe when the requested time is between frames with no position change', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:7, y:8, z:9 }]),
				_createKeyframe(2000, [{ x:7, y:8, z:9 }])
			];

			const snapshot = createCharacterKeyframeAtTime(keyframes, 0, 1500);

			expect(snapshot).toBe(keyframes[0].characters[0]);
			expect(snapshot.position).toEqual({ x:7, y:8, z:9 });
		});
	});

	describe('findCharacterPositionAtTime()', () => {
		it('returns the interpolated character position at the requested time', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:2, y:4, z:6 }]),
				_createKeyframe(2000, [{ x:8, y:10, z:12 }])
			];

			const position = findCharacterPositionAtTime(keyframes, 0, 1500);

			expect(position).toEqual({ x:5, y:7, z:9 });
		});

		it('returns the last keyframe position when the requested time is past the last keyframe', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:2, y:4, z:6 }]),
				_createKeyframe(2000, [{ x:8, y:10, z:12 }])
			];

			const position = findCharacterPositionAtTime(keyframes, 0, 5000);

			expect(position).toBe(keyframes[1].characters[0].position);
			expect(position).toEqual({ x:8, y:10, z:12 });
		});

		it('returns the last keyframe position when the requested time is on the last keyframe', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:2, y:4, z:6 }]),
				_createKeyframe(2000, [{ x:8, y:10, z:12 }])
			];

			const position = findCharacterPositionAtTime(keyframes, 0, 2000);

			expect(position).toBe(keyframes[1].characters[0].position);
			expect(position).toEqual({ x:8, y:10, z:12 });
		});

		it('returns the unchanged character position when the requested time falls between keyframes with the same position', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:8, y:10, z:12 }]),
				_createKeyframe(2000, [{ x:8, y:10, z:12 }])
			];

			const position = findCharacterPositionAtTime(keyframes, 0, 1500);

			expect(position).toBe(keyframes[0].characters[0].position);
			expect(position).toEqual({ x:8, y:10, z:12 });
		});
	});

	describe('findKeyframeForTime()', () => {
		it('returns the keyframe at or immediately before the requested time', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const secondKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const keyframes = [firstKeyframe, secondKeyframe];

			const keyframe = findKeyframeForTime(keyframes, 1500);

			expect(keyframe).toBe(firstKeyframe);
		});

		it('returns the only keyframe when the timeline has a single keyframe', () => {
			const onlyKeyframe = _createKeyframe(1000, [{ x:1, y:2, z:3 }]);

			const keyframe = findKeyframeForTime([onlyKeyframe], 1000);

			expect(keyframe).toBe(onlyKeyframe);
		});

		it('returns the matching keyframe when the requested time lands exactly on a later keyframe', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const secondKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const thirdKeyframe = _createKeyframe(3000, [{ x:20, y:20, z:20 }]);
			const keyframes = [firstKeyframe, secondKeyframe, thirdKeyframe];

			const keyframe = findKeyframeForTime(keyframes, 2000);

			expect(keyframe).toBe(secondKeyframe);
		});

		it('returns the first keyframe when the requested time lands exactly on the first keyframe', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const secondKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const keyframes = [firstKeyframe, secondKeyframe];

			const keyframe = findKeyframeForTime(keyframes, 1000);

			expect(keyframe).toBe(firstKeyframe);
		});

		it('returns the last keyframe when the requested time is after the final keyframe', () => {
			const firstKeyframe = _createKeyframe(1000, [{ x:0, y:0, z:0 }]);
			const secondKeyframe = _createKeyframe(2000, [{ x:10, y:10, z:10 }]);
			const thirdKeyframe = _createKeyframe(3000, [{ x:20, y:20, z:20 }]);
			const keyframes = [firstKeyframe, secondKeyframe, thirdKeyframe];

			const keyframe = findKeyframeForTime(keyframes, 5000);

			expect(keyframe).toBe(thirdKeyframe);
		});

		it('returns the nearest earlier keyframe when the requested time falls between later keyframes in a longer timeline', () => {
			const keyframes = [
				_createKeyframe(1000, [{ x:0, y:0, z:0 }]),
				_createKeyframe(2000, [{ x:10, y:10, z:10 }]),
				_createKeyframe(3000, [{ x:20, y:20, z:20 }]),
				_createKeyframe(4000, [{ x:30, y:30, z:30 }]),
				_createKeyframe(5000, [{ x:40, y:40, z:40 }])
			];

			const keyframe = findKeyframeForTime(keyframes, 3500);

			expect(keyframe).toBe(keyframes[2]);
		});
	});
});
