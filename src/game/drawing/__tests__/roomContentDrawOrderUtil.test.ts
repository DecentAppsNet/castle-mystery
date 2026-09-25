import { describe, expect, it } from 'vitest';

import { ROOM_BACK_Z } from '@/game/roomSpaceConstants';
import CharacterWithEffects from '@/game/types/CharacterWithEffects';
import StairPart, { StairPartType } from '@/game/types/StairPart';

import { mergeStairsWithSortedContents, StairDrawableContent } from '../roomContentDrawOrderUtil';

type SortedNonStairContents = Parameters<typeof mergeStairsWithSortedContents>[1];
type CharacterDrawableContent = Extract<SortedNonStairContents[number], { type:'character' }>;

function _createFlight(startX:number = 265, endX:number = 245):StairPart {
  return {
    type:StairPartType.flight,
    startPosition:{ x:startX, y:80, z:ROOM_BACK_Z },
    endPosition:{ x:endX, y:60, z:ROOM_BACK_Z },
    z:ROOM_BACK_Z
  };
}

function _createStairContent(stairPart:StairPart):StairDrawableContent {
  return { type:'stair', depth:ROOM_BACK_Z, x:255, sortId:'stair-0', stairPart };
}

function _createCharacterContent(id:string, x:number, y:number, z:number):CharacterDrawableContent {
  const position = { x, y, z };
  return {
    type:'character' as const,
    depth:z,
    x,
    y,
    sortId:id,
    character:{ id, position } as CharacterWithEffects,
    displayPosition:position,
    snappedPosition:position,
    painterOrderAnchor:position,
    stackMemberI:0
  };
}

function _expectContentOrder(stairPart:StairPart, sortedContents:SortedNonStairContents, expectedIds:string[]) {
  const contents = mergeStairsWithSortedContents([_createStairContent(stairPart)], sortedContents);
  expect(contents.map(content => content.type === 'character' ? content.character.id : content.sortId)).toEqual(expectedIds);
}

describe('mergeStairsWithSortedContents', () => {
  it('places a left-ascending flight after its traversing character', () => {
    _expectContentOrder(_createFlight(), [
      _createCharacterContent('guard 1', 267.5, 80, 0.1667),
      _createCharacterContent('toro', 255, 70, 0.5),
      _createCharacterContent('guard 2', 267.5, 80, 0.8333)
    ], ['guard 1', 'toro', 'stair-0', 'guard 2']);
  });

  it('places a right-ascending flight before its traversing character', () => {
    _expectContentOrder(_createFlight(245, 265), [
      _createCharacterContent('guard 1', 267.5, 80, 0.1667),
      _createCharacterContent('toro', 255, 70, 0.5),
      _createCharacterContent('guard 2', 267.5, 80, 0.8333)
    ], ['guard 1', 'stair-0', 'toro', 'guard 2']);
  });

  it('places a left-ascending flight after all of its traversing characters', () => {
    _expectContentOrder(_createFlight(), [
      _createCharacterContent('guard 1', 267.5, 80, 0.1667),
      _createCharacterContent('toro', 255, 70, 0.5),
      _createCharacterContent('guard 3', 258, 73, 0.6),
      _createCharacterContent('guard 2', 267.5, 80, 0.8333)
    ], ['guard 1', 'toro', 'guard 3', 'stair-0', 'guard 2']);
  });
});