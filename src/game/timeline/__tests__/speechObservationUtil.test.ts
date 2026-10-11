import { describe, expect, it } from 'vitest';
import { doKeyframesHaveSameObservedSpeech } from '../speechObservationUtil';
import Effect from '@/game/effects/types/Effect';
import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoom } from '@/game/types/Room';
import TimelineKeyframe, { duplicateTimelineKeyframe } from '@/game/types/TimelineKeyframe';

function _createFrames(kind:Effect['kind'] = 'says') {
  const rooms = [createDefaultRoom(), { ...createDefaultRoom(), id:'adjacent', rect:{ x:10, y:0, width:10, height:10 } }];
  const observer = { ...createDefaultCharacterKeyframe(), position:{ x:1, y:1, z:0 } };
  const speaker = { ...createDefaultCharacterKeyframe(), position:{ x:11, y:1, z:0 },
    effects:[{ kind, startTime:0, endTime:100, handler:() => null }] };
  const frameA:TimelineKeyframe = { time:10, characters:[observer, speaker], rooms:[{ items:[], exits:[{
    id:'exit', x:10, y:1, room1Id:'room', room2Id:'adjacent', exitType:'door',
    lockableFromRoom1With:null, lockableFromRoom2With:null, exitStatus:'open'
  }] }, { items:[], exits:[] }] };
  return { rooms, frameA, frameB:duplicateTimelineKeyframe(frameA) };
}

describe('speechObservationUtil', () => {
  describe('doKeyframesHaveSameObservedSpeech()', () => {
    it('matches copied effects with the same handler at different times', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameB.time = 20;
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(true);
    });
    it('detects separate speech events', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameB.characters[1].effects[0].handler = () => null;
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('detects speech ending exactly at the frame time', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameB.time = 100;
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('detects a connecting exit closing using keyframe exit status', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameB.rooms[0].exits[0].exitStatus = 'closed';
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('detects the observer moving out of earshot', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameA.characters[1].position = { x:1, y:1, z:0 };
      frameB.characters[1].position = { x:1, y:1, z:0 };
      frameB.characters[0].position = { x:11, y:1, z:0 };
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('detects changes to the observer thoughts', () => {
      const { rooms, frameA, frameB } = _createFrames('thinks');
      frameA.characters[0].effects = frameA.characters[1].effects;
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('ignores changes to other characters thoughts', () => {
      const { rooms, frameA, frameB } = _createFrames('thinks');
      frameB.characters[1].effects = [];
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(true);
    });
    it('detects additional simultaneous speech', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameB.characters[1].effects.push({ kind:'says', startTime:0, endTime:100, handler:() => null });
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(false);
    });
    it('ignores changes to speech outside earshot', () => {
      const { rooms, frameA, frameB } = _createFrames();
      frameA.rooms[0].exits[0].exitStatus = 'closed';
      frameB.rooms[0].exits[0].exitStatus = 'closed';
      frameB.characters[1].effects = [];
      expect(doKeyframesHaveSameObservedSpeech(frameA, frameB, 0, rooms)).toBe(true);
    });
  });
});