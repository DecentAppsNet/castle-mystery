import { describe, it, expect } from 'vitest';

import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';
import { addCharacterKeyChanges, addRoomKeyChanges, createEditableTimeline } from '../editingUtil';
import { createKeyframeAtTime, findCharacterPositionAtTime } from '@/game/timeline';

function _position(x:number, y = 0, z = 0) {
  return { x, y, z };
}

function _character(id:string, x:number) {
  return {
    ...createDefaultCharacter(),
    id,
    position:_position(x)
  };
}

function _item(id:string, x:number) {
  return {
    ...createDefaultItem(),
    id,
    position:_position(x)
  };
}

function _room(id:string, items = [_item('crown', 1)]) {
  return {
    ...createDefaultRoom(),
    id,
    items
  };
}

describe('timelineLoadingApi', () => {
  describe('createEditableTimeline()', () => {
    it('creates a minimal timeline', () => {
      const timeline = createEditableTimeline([], [], 1234);

      expect(timeline.characterIdToI).toEqual({});
      expect(timeline.roomIdToI).toEqual({});
      expect(timeline.keyframes).toHaveLength(1);
      expect(timeline.editableKeyframes).toHaveLength(1);
      expect(timeline.keyframes[0]).toEqual({
        time:1234,
        characters:[],
        rooms:[]
      });
      expect(timeline.editableKeyframes[0]).toBe(timeline.keyframes[0]);
    });

    it('creates a timeline with starting character positions', () => {
      const alpha = {
        ...createDefaultCharacter(),
        id:'alpha',
        position:{ x:1, y:2, z:3 }
      };
      const beta = {
        ...createDefaultCharacter(),
        id:'beta',
        position:{ x:10, y:20, z:30 }
      };

      const timeline = createEditableTimeline([alpha, beta], [], 5000);
      const alphaPosition = findCharacterPositionAtTime(timeline.keyframes, 0, 5000);
      const betaPosition = findCharacterPositionAtTime(timeline.keyframes, 1, 5000);

      expect(timeline.characterIdToI).toEqual({ alpha:0, beta:1 });
      expect(alphaPosition).toEqual({ x:1, y:2, z:3 });
      expect(betaPosition).toEqual({ x:10, y:20, z:30 });
      expect(alphaPosition).not.toBe(alpha.position);
      expect(betaPosition).not.toBe(beta.position);
    });

    it('creates a timeline with starting room positions', () => {
      const crown = {
        ...createDefaultItem(),
        id:'crown',
        position:{ x:4, y:5, z:6 }
      };
      const hall = {
        ...createDefaultRoom(),
        id:'hall',
        items:[crown]
      };

      const timeline = createEditableTimeline([], [hall], 5000);
      const snapshot = createKeyframeAtTime(timeline.keyframes, 5000);

      expect(timeline.roomIdToI).toEqual({ hall:0 });
      expect(snapshot.rooms[0]?.items).toHaveLength(1);
      expect(snapshot.rooms[0]?.items[0]).toMatchObject({
        id:'crown',
        position:{ x:4, y:5, z:6 }
      });
      expect(snapshot.rooms[0]?.items[0]).not.toBe(crown);
      expect(snapshot.rooms[0]?.items[0]?.position).not.toBe(crown.position);
    });
  });

  describe('addCharacterKeyChanges()', () => {
    it('merges multiple character updates at the same time into one resulting keyframe', () => {
      const timeline = createEditableTimeline([_character('alpha', 0)], [], 1000);

      addCharacterKeyChanges({ isVisible:false }, 0, 1000, timeline);
      addCharacterKeyChanges({ skinId:'guard' }, 0, 1000, timeline);

      const snapshot = createKeyframeAtTime(timeline.keyframes, 1000);

      expect(timeline.keyframes).toHaveLength(1);
      expect(snapshot.characters[0]).toMatchObject({
        isVisible:false,
        skinId:'guard'
      });
    });

    it('interpolates position at a new keyframe when a later position is authored separately', () => {
      const timeline = createEditableTimeline([_character('alpha', 0)], [], 1000);

      addCharacterKeyChanges({ isVisible:false }, 0, 2000, timeline);
      addCharacterKeyChanges({ position:_position(30) }, 0, 4000, timeline);

      const snapshot = createKeyframeAtTime(timeline.keyframes, 2000);

      expect(snapshot.characters[0]).toMatchObject({
        isVisible:false,
        position:_position(10)
      });
    });
  });

  describe('addRoomKeyChanges()', () => {
    it('adds room changes at a new time without changing earlier room state', () => {
      const timeline = createEditableTimeline([], [_room('hall')], 1000);
      const laterItems = [_item('relic', 9)];

      addRoomKeyChanges({ items:laterItems }, 0, 2000, timeline);

      const startSnapshot = createKeyframeAtTime(timeline.keyframes, 1000);
      const laterSnapshot = createKeyframeAtTime(timeline.keyframes, 2000);

      expect(timeline.keyframes).toHaveLength(2);
      expect(startSnapshot.rooms[0]?.items[0]).toMatchObject({ id:'crown', position:_position(1) });
      expect(laterSnapshot.rooms[0]?.items[0]).toMatchObject({ id:'relic', position:_position(9) });
    });

    it('merges room changes into an existing timestamp without disturbing character changes at that time', () => {
      const timeline = createEditableTimeline([_character('alpha', 0)], [_room('hall')], 1000);
      const laterItems = [_item('relic', 9)];

      addCharacterKeyChanges({ isVisible:false }, 0, 1000, timeline);
      addRoomKeyChanges({ items:laterItems }, 0, 1000, timeline);

      const snapshot = createKeyframeAtTime(timeline.keyframes, 1000);

      expect(timeline.keyframes).toHaveLength(1);
      expect(snapshot.characters[0]?.isVisible).toBe(false);
      expect(snapshot.rooms[0]?.items[0]).toMatchObject({ id:'relic', position:_position(9) });
    });
  });
});