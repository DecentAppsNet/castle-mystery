import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '@/game/types/Character';
import ExitStatus from '@/game/types/ExitStatus';
import ExitType from '@/game/types/ExitType';
import Rect from '@/game/types/Rect';
import Room, { createDefaultRoom } from '@/game/types/Room';
import RoomExit, { createRoomExitId } from '@/game/types/RoomExit';
import { StairLandingType, StairPartType } from '@/game/types/StairPart';
import Waypoint from '@/game/types/Waypoint';
import { generateWaypoints } from '@/levelLoading/waypointGenerationUtil';
import { ROOM_BACK_ROW_CENTER_Z, ROOM_BACK_Z, ROOM_FULL_DEPTH, ROOM_MIDDLE_ROW_MIN_Z, ROOM_ROW_DEPTH } from '@/game/roomSpaceConstants';
import { generateStairFlights } from '@/game/stairFlightUtil';
import { generateStairParts } from '@/game/stairPartUtil';
import { compareStairToContent, mergeStairsWithSortedContents, RoomDrawableContent, StairDrawableContent } from '../roomContentDrawOrderUtil';

const BACK_ROW_Z = ROOM_BACK_Z;
const BACK_ROW_CHARACTER_DEPTH = ROOM_BACK_ROW_CENTER_Z;
const MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_MIN_Z;
const CATWALK_DEPTH = ROOM_ROW_DEPTH;
const FULL_DEPTH = ROOM_FULL_DEPTH;
const ROOM_ID = 'Room';

function _createExit(room2Id:string, x:number, y:number):RoomExit {
  return {
    id:createRoomExitId(ROOM_ID, room2Id, x, y),
    room1Id:ROOM_ID,
    room2Id,
    x,
    y,
    exitType:ExitType.doorway,
    lockableFromRoom1With:null,
    lockableFromRoom2With:null,
    exitStatus:ExitStatus.open
  };
}

function _createRoom(rect:Rect, exits:RoomExit[], waypoints?:Waypoint[]):Room {
  return {
    ...createDefaultRoom(),
    id:ROOM_ID,
    title:ROOM_ID,
    rect,
    exits,
    waypoints:waypoints || generateWaypoints(ROOM_ID, rect, exits)
  };
}

function _createCharacterContent(x:number, y:number):Exclude<RoomDrawableContent, { type:'stair' }> {
  return {
    type:'character',
    depth:BACK_ROW_CHARACTER_DEPTH,
    x,
    y,
    sortId:'character',
    character:{
      ...createDefaultCharacter(),
      id:'character',
      title:'Character',
      description:'Character',
      position:{ x, y, z:BACK_ROW_CHARACTER_DEPTH },
      waypoint:{ position:{ x, y, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} }
    }
  };
}

function _createCatwalkContent(sortId:string):StairDrawableContent {
  return {
    type:'stair',
    depth:MIDDLE_ROW_Z,
    x:20,
    sortId,
    stairPart:{
      type:StairPartType.catwalk,
      leftX:15,
      topY:10,
      width:10,
      height:1,
      z:MIDDLE_ROW_Z,
      depth:CATWALK_DEPTH
    }
  };
}

function _createLeftAscendingFlightContent(sortId:string):StairDrawableContent {
  return {
    type:'stair',
    depth:MIDDLE_ROW_Z,
    x:6,
    sortId,
    stairPart:{
      type:StairPartType.flight,
      startPosition:{ x:8, y:20, z:BACK_ROW_Z },
      endPosition:{ x:4, y:10, z:BACK_ROW_Z },
      z:MIDDLE_ROW_Z
    }
  };
}

function _createFullStoryLandingContent(sortId:string):StairDrawableContent {
  return {
    type:'stair',
    depth:BACK_ROW_Z,
    x:10,
    sortId,
    stairPart:{
      type:StairPartType.landing,
      landingType:StairLandingType.fullStory,
      leftX:5,
      topY:10,
      width:10,
      height:1,
      z:BACK_ROW_Z,
      depth:FULL_DEPTH
    }
  };
}

function _toStairDrawableContents(stairParts:Room['stairParts']):StairDrawableContent[] {
  return stairParts.map((stairPart, stairIndex) => ({
    type:'stair' as const,
    depth:stairPart.z,
    x:stairPart.type === StairPartType.flight
      ? (stairPart.startPosition.x + stairPart.endPosition.x) / 2
      : stairPart.leftX + stairPart.width / 2,
    sortId:`stair-${stairIndex}`,
    stairPart
  }));
}

describe('roomContentDrawOrderUtil', () => {
  describe('compareStairToContent()', () => {
    it('can place both a middle-row catwalk and a full-story landing before a back-row character', () => {
      const characterContent = _createCharacterContent(10, 10.5);

      expect(compareStairToContent(_createCatwalkContent('catwalk'), characterContent)).toBeLessThan(0);
      expect(compareStairToContent(_createFullStoryLandingContent('landing'), characterContent)).toBeLessThan(0);
    });
  });

  describe('mergeStairsWithSortedContents()', () => {
    it('preserves stair-part order when both the catwalk and later landing sort before the character', () => {
      const characterContent = _createCharacterContent(10, 10.5);
      const mergedContents = mergeStairsWithSortedContents([
        _createCatwalkContent('catwalk'),
        _createFullStoryLandingContent('landing')
      ], [characterContent]);

      expect(mergedContents.map(content => content.sortId)).toEqual(['catwalk', 'landing', 'character']);
    });

    it('draws the right catwalk and terminal winding story landing before a back-row character in a real one-story winding stair sequence', () => {
      const rect = { x:0, y:0, width:30, height:40 };
      const exits = [_createExit('Left', 0, 20), _createExit('Right', 30, 20)];
      const room = _createRoom(rect, exits);
      const stairContents = _toStairDrawableContents(generateStairParts(room, generateStairFlights(room)));
      const characterContent = _createCharacterContent(8, 20.5);
      const rightCatwalk = stairContents.find(stairContent =>
        stairContent.stairPart.type === StairPartType.catwalk
        && stairContent.stairPart.leftX > 0);
      const storyLanding = stairContents.find(stairContent =>
        stairContent.stairPart.type === StairPartType.landing
        && stairContent.stairPart.z === MIDDLE_ROW_Z
        && stairContent.stairPart.depth < FULL_DEPTH);

      const mergedContents = mergeStairsWithSortedContents(stairContents, [characterContent]);
      const characterIndex = mergedContents.findIndex(content => content.sortId === 'character');
      const storyLandingIndex = mergedContents.findIndex(content => content.sortId === storyLanding?.sortId);

      expect(rightCatwalk).toBeDefined();
      expect(storyLanding).toBeDefined();
      expect(compareStairToContent(rightCatwalk!, characterContent)).toBeLessThan(0);
      expect(compareStairToContent(storyLanding!, characterContent)).toBeLessThan(0);
      expect(characterIndex).toBeGreaterThanOrEqual(0);
      expect(storyLandingIndex).toBeLessThan(characterIndex);
    });

    it('does not pull an earlier left-ascending flight ahead of the character just because a later full-story landing needs to be ahead', () => {
      const characterContent = _createCharacterContent(6, 10.5);
      const leftAscendingFlight = _createLeftAscendingFlightContent('flight');
      const fullStoryLanding = _createFullStoryLandingContent('landing');

      expect(compareStairToContent(leftAscendingFlight, characterContent)).toBeGreaterThan(0);
      expect(compareStairToContent(fullStoryLanding, characterContent)).toBeLessThan(0);

      const mergedContents = mergeStairsWithSortedContents([leftAscendingFlight, fullStoryLanding], [characterContent]);

      expect(mergedContents.map(content => content.sortId)).toEqual(['character', 'flight', 'landing']);
    });

    it('draws a later full-story landing before the character by emitting the fixed-order stair prefix that leads to it', () => {
      const rect = { x:0, y:0, width:30, height:60 };
      const exits = [_createExit('Left', 0, 20), _createExit('Right', 30, 20)];
      const room = _createRoom(rect, exits);
      const stairContents = _toStairDrawableContents(generateStairParts(room, generateStairFlights(room)));
      const fullStoryLanding = stairContents.find(stairContent =>
        stairContent.stairPart.type === StairPartType.landing
        && stairContent.stairPart.landingType === StairLandingType.fullStory);
      const characterContent = _createCharacterContent(8, 30.5);
      const blockingStairContent = stairContents.find(stairContent =>
        stairContent.sortId !== fullStoryLanding?.sortId
        && compareStairToContent(stairContent, characterContent) > 0);

      expect(fullStoryLanding).toBeDefined();
      expect(compareStairToContent(fullStoryLanding!, characterContent)).toBeLessThan(0);
      expect(blockingStairContent).toBeDefined();
      expect(blockingStairContent?.stairPart.type).toBe(StairPartType.catwalk);

      const mergedContents = mergeStairsWithSortedContents(stairContents, [characterContent]);
      const characterIndex = mergedContents.findIndex(content => content.sortId === 'character');
      const fullStoryLandingIndex = mergedContents.findIndex(content => content.sortId === fullStoryLanding?.sortId);
      const blockingStairIndex = mergedContents.findIndex(content => content.sortId === blockingStairContent?.sortId);

      expect(characterIndex).toBeGreaterThanOrEqual(0);
      expect(blockingStairIndex).toBeLessThan(characterIndex);
      expect(fullStoryLandingIndex).toBeLessThan(characterIndex);
    });

    it('does pull the blocking catwalk ahead of the character when that lets a later full-story landing stay ahead too', () => {
      const rect = { x:0, y:0, width:30, height:60 };
      const exits = [_createExit('Left', 0, 20), _createExit('Right', 30, 20)];
      const room = _createRoom(rect, exits);
      const stairContents = _toStairDrawableContents(generateStairParts(room, generateStairFlights(room)));
      const blockingCatwalk = stairContents.find(stairContent =>
        stairContent.stairPart.type === StairPartType.catwalk
        && compareStairToContent(stairContent, _createCharacterContent(8, 30.5)) > 0);
      const fullStoryLanding = stairContents.find(stairContent =>
        stairContent.stairPart.type === StairPartType.landing
        && stairContent.stairPart.landingType === StairLandingType.fullStory);
      const characterContent = _createCharacterContent(8, 30.5);

      expect(blockingCatwalk).toBeDefined();
      expect(fullStoryLanding).toBeDefined();
      expect(compareStairToContent(blockingCatwalk!, characterContent)).toBeGreaterThan(0);
      expect(compareStairToContent(fullStoryLanding!, characterContent)).toBeLessThan(0);

      const mergedContents = mergeStairsWithSortedContents(stairContents, [characterContent]);
      const characterIndex = mergedContents.findIndex(content => content.sortId === 'character');
      const blockingCatwalkIndex = mergedContents.findIndex(content => content.sortId === blockingCatwalk?.sortId);
      const fullStoryLandingIndex = mergedContents.findIndex(content => content.sortId === fullStoryLanding?.sortId);

      expect(blockingCatwalkIndex).toBeLessThan(characterIndex);
      expect(fullStoryLandingIndex).toBeLessThan(characterIndex);
    });
  });
});