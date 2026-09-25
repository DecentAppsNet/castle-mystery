import { describe, expect, it } from 'vitest';

import { mergeStairsWithSortedContents, StairDrawableContent } from '../roomContentDrawOrderUtil';
import { ROOM_BACK_Z } from '../../roomSpaceConstants';
import StairPart, { StairPartType } from '../../types/StairPart';

function _createFlight():StairPart {
  return {
    type:StairPartType.flight,
    startPosition:{ x:265, y:80, z:ROOM_BACK_Z },
    endPosition:{ x:245, y:60, z:ROOM_BACK_Z },
    z:ROOM_BACK_Z
  };
}

function _createStairContent(stairPart:StairPart):StairDrawableContent {
  return { type:'stair', depth:ROOM_BACK_Z, x:255, sortId:'stair-0', stairPart };
}

function _createCharacterContent(id:string, x:number, y:number, z:number) {
  const position = { x, y, z };
  return {
    type:'character' as const,
    depth:z,
    x,
    y,
    sortId:id,
    character:{ id, position },
    displayPosition:position,
    snappedPosition:position,
    painterOrderAnchor:position,
    stackMemberI:0
  };
}

describe('mergeStairsWithSortedContents', () => {
  it('places a left-ascending flight after its traversing character', () => {
    const contents = mergeStairsWithSortedContents(
      [_createStairContent(_createFlight())],
      [
        _createCharacterContent('guard 1', 267.5, 80, 0.1667),
        _createCharacterContent('toro', 255, 70, 0.5),
        _createCharacterContent('guard 2', 267.5, 80, 0.8333)
      ] as any
    );

    expect(contents.map(content => content.type === 'character' ? content.character.id : content.sortId))
      .toEqual(['guard 1', 'toro', 'stair-0', 'guard 2']);
  });
});