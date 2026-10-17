import { describe, expect, it } from 'vitest';

import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultRoomKeyframe } from '@/game/types/RoomKeyframe';
import Timeline from '@/game/types/Timeline';
import { findPreviousTimelineBeat } from '../beatUtil';

const ROOMS = [
	{ ...createDefaultRoom(), id:'left', rect:{ x:0, y:0, width:10, height:10 } },
	{ ...createDefaultRoom(), id:'right', rect:{ x:10, y:0, width:10, height:10 } }
];

function _createTimeline(positions:number[]):Timeline {
	return {
		startTime:1000,
		endTime:3000,
		characterIds:['walker'],
		characterIdToI:{ walker:0 },
		roomIdToI:{ left:0, right:1 },
		keyframes:positions.map((positionX, positionI) => ({
			time:(positionI + 1) * 1000,
			characters:[{ ...createDefaultCharacterKeyframe(), position:{ x:positionX, y:5, z:0 } }],
			rooms:[createDefaultRoomKeyframe(), createDefaultRoomKeyframe()]
		}))
	};
}

describe('beatUtil', () => {
	describe('findPreviousTimelineBeat()', () => {
		it('excludes the keyframe at the exact requested time', () => {
			const timeline = _createTimeline([2, 12, 18]);

			expect(findPreviousTimelineBeat(ROOMS, timeline, 2000, 'walker')).toBe(1000);
		});

		it('skips an immediate predecessor with the same room state between keyframes', () => {
			const timeline = _createTimeline([2, 12, 18]);

			expect(findPreviousTimelineBeat(ROOMS, timeline, 2500, 'walker')).toBe(1000);
		});

		it('includes the immediate predecessor when interpolation has crossed into another room', () => {
			const timeline = _createTimeline([2, 8, 18]);

			expect(findPreviousTimelineBeat(ROOMS, timeline, 2500, 'walker')).toBe(2000);
		});
	});
});