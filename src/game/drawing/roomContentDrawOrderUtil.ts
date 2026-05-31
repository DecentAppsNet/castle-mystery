import { compareCharacterToStairPartRows } from "../stairDrawOrderUtil";
import Character from "../types/Character";
import Item from "../types/Item";
import StairPart, { StairLandingType, StairPartType } from "../types/StairPart";

export type StairDrawableContent = {
  type:'stair',
  depth:number,
  x:number,
  sortId:string,
  stairPart:StairPart
};

export type CharacterDrawableContent = {
  type:'character',
  depth:number,
  x:number,
  sortId:string,
  character:Character
};

export type ItemDrawableContent = {
  type:'item',
  depth:number,
  x:number,
  sortId:string,
  item:Item
};

export type RoomDrawableContent = StairDrawableContent | CharacterDrawableContent | ItemDrawableContent;

export function compareNonStairDrawableContents(content1:Exclude<RoomDrawableContent, { kind:'stair' }>, content2:Exclude<RoomDrawableContent, { kind:'stair' }>):number {
  return content1.depth - content2.depth || content2.x - content1.x || content1.sortId.localeCompare(content2.sortId);
}

export function compareStairToContent(stairContent:StairDrawableContent, content:Exclude<RoomDrawableContent, { kind:'stair' }>):number {
  if (content.type === 'character') {
    const stairComparison = compareCharacterToStairPartRows(content.character.x, content.character.y, content.character.depth, stairContent.stairPart);
    if (stairComparison !== 0) return -stairComparison;
  }

  return stairContent.depth - content.depth || content.x - stairContent.x || stairContent.sortId.localeCompare(content.sortId);
}

function _hasLaterFullStoryLandingBeforeCharacter(stairContents:StairDrawableContent[], startIndex:number,
  content:Exclude<RoomDrawableContent, { kind:'stair' }>):boolean {
  if (content.type !== 'character') return false;

  for (let stairIndex = startIndex + 1; stairIndex < stairContents.length; stairIndex += 1) {
    const stairPart = stairContents[stairIndex].stairPart;
    if (stairPart.type !== StairPartType.landing || stairPart.landingType !== StairLandingType.fullStory) continue;
    if (compareStairToContent(stairContents[stairIndex], content) <= 0) return true;
  }

  return false;
}

export function mergeStairsWithSortedContents(stairContents:StairDrawableContent[],
  sortedContents:Exclude<RoomDrawableContent, { kind:'stair' }>[]):RoomDrawableContent[] {
  const mergedContents:RoomDrawableContent[] = [];
  let stairIndex = 0;

  sortedContents.forEach(content => {
    while (stairIndex < stairContents.length) {
      if (compareStairToContent(stairContents[stairIndex], content) <= 0) {
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