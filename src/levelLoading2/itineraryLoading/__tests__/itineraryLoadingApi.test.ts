import { describe, it, expect } from 'vitest';

import { createEditableItinerary, createSnapshotAtTime, findCharacterPositionAtTime, addKeyframe, 
    addCharacterKeyframe, addRoomKeyframe } from "../";
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';

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

describe('itineraryLoadingApi', () => {
  describe('createEditableItinerary()', () => {
    it('creates a minimal itinerary', () => {
      const itinerary = createEditableItinerary([], [], 1234);

      expect(itinerary.characterIdToI).toEqual({});
      expect(itinerary.roomIdToI).toEqual({});
      expect(itinerary.keyframes).toHaveLength(1);
      expect(itinerary.editableKeyframes).toHaveLength(1);
      expect(itinerary.keyframes[0]).toEqual({
        time:1234,
        characters:[],
        rooms:[]
      });
      expect(itinerary.editableKeyframes[0]).toBe(itinerary.keyframes[0]);
    });

    it('creates an itinerary with starting character positions', () => {
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

      const itinerary = createEditableItinerary([alpha, beta], [], 5000);
      const alphaPosition = findCharacterPositionAtTime(itinerary.keyframes, 0, 5000);
      const betaPosition = findCharacterPositionAtTime(itinerary.keyframes, 1, 5000);

      expect(itinerary.characterIdToI).toEqual({ alpha:0, beta:1 });
      expect(alphaPosition).toEqual({ x:1, y:2, z:3 });
      expect(betaPosition).toEqual({ x:10, y:20, z:30 });
      expect(alphaPosition).not.toBe(alpha.position);
      expect(betaPosition).not.toBe(beta.position);
    });

    it('creates an itinerary with starting room positions', () => {
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

      const itinerary = createEditableItinerary([], [hall], 5000);
      const snapshot = createSnapshotAtTime(itinerary.keyframes, 5000);

      expect(itinerary.roomIdToI).toEqual({ hall:0 });
      expect(snapshot.rooms[0]?.items).toHaveLength(1);
      expect(snapshot.rooms[0]?.items[0]).toMatchObject({
        id:'crown',
        position:{ x:4, y:5, z:6 }
      });
      expect(snapshot.rooms[0]?.items[0]).not.toBe(crown);
      expect(snapshot.rooms[0]?.items[0]?.position).not.toBe(crown.position);
    });
  });

  describe('addCharacterKeyframe()', () => {
    it('merges multiple character updates at the same time into one resulting keyframe', () => {
      const itinerary = createEditableItinerary([_character('alpha', 0)], [], 1000);

      addCharacterKeyframe({ isVisible:false }, 0, 1000, itinerary);
      addCharacterKeyframe({ appearanceId:'guard' }, 0, 1000, itinerary);

      const snapshot = createSnapshotAtTime(itinerary.keyframes, 1000);

      expect(itinerary.keyframes).toHaveLength(1);
      expect(snapshot.characters[0]).toMatchObject({
        isVisible:false,
        appearanceId:'guard'
      });
    });

    it('interpolates position at a new keyframe when a later position is authored separately', () => {
      const itinerary = createEditableItinerary([_character('alpha', 0)], [], 1000);

      addCharacterKeyframe({ isVisible:false }, 0, 2000, itinerary);
      addCharacterKeyframe({ position:_position(30) }, 0, 4000, itinerary);

      const snapshot = createSnapshotAtTime(itinerary.keyframes, 2000);

      expect(snapshot.characters[0]).toMatchObject({
        isVisible:false,
        position:_position(10)
      });
    });
  });

  describe('addRoomKeyframe()', () => {
    it('adds room changes at a new time without changing earlier room state', () => {
      const itinerary = createEditableItinerary([], [_room('hall')], 1000);
      const laterItems = [_item('relic', 9)];

      addRoomKeyframe({ items:laterItems }, 0, 2000, itinerary);

      const startSnapshot = createSnapshotAtTime(itinerary.keyframes, 1000);
      const laterSnapshot = createSnapshotAtTime(itinerary.keyframes, 2000);

      expect(itinerary.keyframes).toHaveLength(2);
      expect(startSnapshot.rooms[0]?.items[0]).toMatchObject({ id:'crown', position:_position(1) });
      expect(laterSnapshot.rooms[0]?.items[0]).toMatchObject({ id:'relic', position:_position(9) });
    });

    it('merges room changes into an existing timestamp without disturbing character changes at that time', () => {
      const itinerary = createEditableItinerary([_character('alpha', 0)], [_room('hall')], 1000);
      const laterItems = [_item('relic', 9)];

      addCharacterKeyframe({ isVisible:false }, 0, 1000, itinerary);
      addRoomKeyframe({ items:laterItems }, 0, 1000, itinerary);

      const snapshot = createSnapshotAtTime(itinerary.keyframes, 1000);

      expect(itinerary.keyframes).toHaveLength(1);
      expect(snapshot.characters[0]?.isVisible).toBe(false);
      expect(snapshot.rooms[0]?.items[0]).toMatchObject({ id:'relic', position:_position(9) });
    });
  });

  describe('addKeyframe()', () => {
    it('appends a later partial keyframe and resolves its values into the itinerary', () => {
      const itinerary = createEditableItinerary([_character('alpha', 0)], [], 1000);

      addKeyframe({
        time:3000,
        characters:[{ position:_position(30) }],
        rooms:[]
      }, itinerary);

      const position = findCharacterPositionAtTime(itinerary.keyframes, 0, 3000);

      expect(itinerary.keyframes).toHaveLength(2);
      expect(position).toEqual(_position(30));
    });

    it('inserts a keyframe before a later one and resolves interpolated values at that time', () => {
      const itinerary = createEditableItinerary([_character('alpha', 0)], [], 1000);

      addKeyframe({
        time:3000,
        characters:[{ position:_position(30) }],
        rooms:[]
      }, itinerary);
      addKeyframe({
        time:2000,
        characters:[{ isVisible:false }],
        rooms:[]
      }, itinerary);

      const snapshot = createSnapshotAtTime(itinerary.keyframes, 2000);

      expect(itinerary.keyframes.map(keyframe => keyframe.time)).toEqual([1000, 2000, 3000]);
      expect(snapshot.characters[0]).toMatchObject({
        isVisible:false,
        position:_position(15)
      });
    });
  });
});