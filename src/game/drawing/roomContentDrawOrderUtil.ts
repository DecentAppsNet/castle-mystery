/* This file orders room characters, items, and stair parts for layered drawing.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { compareCharacterToStairPartRows, isCharacterOnStairFlight } from "../stairDrawOrderUtil";
import CharacterWithEffects from "../types/CharacterWithEffects";
import Item from "../types/Item";
import Position from "../types/Position";
import StairPart, { StairLandingType, StairPartType } from "../types/StairPart";

function _comparePositionedContentForDrawOrder(depth1:number, x1:number, y1:number, sortId1:string,
  depth2:number, x2:number, y2:number, sortId2:string):number {
  return depth1 - depth2
    || y2 - y1
    || x2 - x1
    || sortId1.localeCompare(sortId2);
}

/** A stair part with the ordering coordinates used when merging room contents. */
export type StairDrawableContent = {
  type:'stair',
  depth:number,
  x:number,
  sortId:string,
  stairPart:StairPart
};

type CharacterDrawableContent = {
  type:'character',
  depth:number,
  x:number,
  y:number,
  sortId:string,
  character:CharacterWithEffects,
  displayPosition:Position,
  snappedPosition:Position,
  painterOrderAnchor:Position,
  stackMemberI:number
};

type ItemDrawableContent = {
  type:'item',
  depth:number,
  x:number,
  y:number,
  sortId:string,
  item:Item,
  displayPosition:Position,
  painterOrderAnchor:Position,
  stackMemberI:number
};

/** A drawable room entity after stair parts have been interleaved with characters and items. */
export type RoomDrawableContent = StairDrawableContent | CharacterDrawableContent | ItemDrawableContent;
type NonStairDrawableContent = CharacterDrawableContent | ItemDrawableContent;

function _getSnappedPosition(content:NonStairDrawableContent):Position {
  return content.type === 'item' ? content.item.position : content.snappedPosition;
}

function _areContentsInSameStackGroup(content1:NonStairDrawableContent,
  content2:NonStairDrawableContent):boolean {
  const snappedPosition1 = _getSnappedPosition(content1);
  const snappedPosition2 = _getSnappedPosition(content2);
  return snappedPosition1.x === snappedPosition2.x && snappedPosition1.z === snappedPosition2.z;
}

function _createStackGroupSortId(content:NonStairDrawableContent):string {
  const snappedPosition = _getSnappedPosition(content);
  return `${snappedPosition.x},${snappedPosition.z}`;
}

function _compareSameStackGroupContents(content1:NonStairDrawableContent,
  content2:NonStairDrawableContent):number {
  if (content1.type === 'item' && content2.type === 'item') return content1.stackMemberI - content2.stackMemberI;
  if (content1.type !== content2.type) return content1.type === 'item' ? -1 : 1;
  return _comparePositionedContentForDrawOrder(
    content1.depth, content1.x, content1.y, content1.sortId,
    content2.depth, content2.x, content2.y, content2.sortId
  );
}

/** Orders characters and items by their shared floor-square stack or painter-order anchor. */
export function compareNonStairDrawableContents(content1:NonStairDrawableContent, content2:NonStairDrawableContent):number {
  if (_areContentsInSameStackGroup(content1, content2)) {
    return _compareSameStackGroupContents(content1, content2);
  }
  return _comparePositionedContentForDrawOrder(
    content1.painterOrderAnchor.z, content1.painterOrderAnchor.x, content1.painterOrderAnchor.y,
    _createStackGroupSortId(content1),
    content2.painterOrderAnchor.z, content2.painterOrderAnchor.x, content2.painterOrderAnchor.y,
    _createStackGroupSortId(content2)
  );
}

function _compareStairToContent(stairContent:StairDrawableContent, content:NonStairDrawableContent):number {
  if (content.type === 'character') {
    const stairComparison = compareCharacterToStairPartRows(
      content.character.position.x,
      content.character.position.y,
      content.character.position.z,
      stairContent.stairPart
    );
    if (stairComparison !== 0) return -stairComparison;
  }

  return stairContent.depth - content.depth || content.x - stairContent.x || stairContent.sortId.localeCompare(content.sortId);
}

function _hasLaterFullStoryLandingBeforeCharacter(stairContents:StairDrawableContent[], startIndex:number,
  content:NonStairDrawableContent):boolean {
  if (content.type !== 'character') return false;

  for (let stairIndex = startIndex + 1; stairIndex < stairContents.length; stairIndex += 1) {
    const stairPart = stairContents[stairIndex].stairPart;
    if (stairPart.type !== StairPartType.landing || stairPart.landingType !== StairLandingType.fullStory) continue;
    if (_compareStairToContent(stairContents[stairIndex], content) <= 0) return true;
  }

  return false;
}

function _findTraversedFlightInsertionIndex(stairContent:StairDrawableContent,
  sortedContents:NonStairDrawableContent[]):number|null {
  const { stairPart } = stairContent;
  if (stairPart.type !== StairPartType.flight) return null;

  const traversingContentIs:number[] = [];
  sortedContents.forEach((content, contentI) => {
    if (content.type !== 'character') return;
    const { x, y } = content.character.position;
    if (isCharacterOnStairFlight(x, y, stairPart)) traversingContentIs.push(contentI);
  });
  if (!traversingContentIs.length) return null;

  return stairPart.endPosition.x > stairPart.startPosition.x
    ? traversingContentIs[0]
    : traversingContentIs[traversingContentIs.length - 1] + 1;
}

/** Merges stair parts with ordered room contents, grouping each traversed flight with its characters. */
export function mergeStairsWithSortedContents(stairContents:StairDrawableContent[],
    sortedContents:NonStairDrawableContent[]):RoomDrawableContent[] {
  const insertionIndexes = stairContents.map(stairContent =>
    _findTraversedFlightInsertionIndex(stairContent, sortedContents));
  const mergedContents:RoomDrawableContent[] = [];
  let stairIndex = 0;

  sortedContents.forEach((content, contentI) => {
    while (stairIndex < stairContents.length) {
      const insertionIndex = insertionIndexes[stairIndex];
      if (insertionIndex !== null) {
        if (contentI < insertionIndex) break;
        mergedContents.push(stairContents[stairIndex]);
        stairIndex += 1;
        continue;
      }
      if (_compareStairToContent(stairContents[stairIndex], content) <= 0) {
        mergedContents.push(stairContents[stairIndex]);
        stairIndex += 1;
        continue;
      }
      if (stairContents[stairIndex].stairPart.type === StairPartType.catwalk
        && _hasLaterFullStoryLandingBeforeCharacter(stairContents, stairIndex, content)) {
        mergedContents.push(stairContents[stairIndex]);
        stairIndex += 1;
        continue;
      }
      break;
    }

    mergedContents.push(content);
  });

  while (stairIndex < stairContents.length) {
    mergedContents.push(stairContents[stairIndex]);
    stairIndex += 1;
  }

  return mergedContents;
}