/* This module groups drop-activity parsing and drop-target waypoint selection during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item from "@/game/types/Item";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createDropItemEvent } from "@/game/itineraryUtil";
import { calcItemCuboidHeightGame } from "@/game/itemSizeUtil";
import { roomWidthToColumnCount } from "@/game/roomGridUtil";
import { findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z, WAYPOINT_FRONT_ROW_Z, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findCurrentRoom, removeStateOwnedItem } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { stripTrailingPeriod } from "./activity/activityTextParseUtil";

type ParsedDropParts = {
  itemRef:string,
  drawOffset:Item['drawOffset']
}

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _isExitWaypoint(room:ReturnType<typeof findCurrentRoom>, waypoint:Waypoint):boolean {
  return waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && room.exits.some(exit => exit.x === waypoint.position.x && exit.y === waypoint.position.y);
}

function _isOrthogonalToSource(sourceWaypoint:Waypoint, candidateWaypoint:Waypoint):boolean {
  return (candidateWaypoint.position.x === sourceWaypoint.position.x)
    !== (candidateWaypoint.position.z === sourceWaypoint.position.z);
}

function _findWaypointColumnIndex(room:ReturnType<typeof findCurrentRoom>, waypoint:Waypoint):number {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  return Math.floor((waypoint.position.x - room.rect.x) / columnWidth);
}

function _isCenteredRoomColumnX(room:ReturnType<typeof findCurrentRoom>, x:number):boolean {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnIndex = Math.floor((x - room.rect.x) / columnWidth);
  const centeredX = room.rect.x + (columnIndex + 0.5) * columnWidth;
  return Math.abs(x - centeredX) <= FLOOR_WAYPOINT_Y_OFFSET;
}

function _isColRowCenteredWaypoint(room:ReturnType<typeof findCurrentRoom>, waypoint:Waypoint):boolean {
  const isCenteredRow = waypoint.position.z === WAYPOINT_BACK_ROW_Z
    || waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    || waypoint.position.z === WAYPOINT_FRONT_ROW_Z;
  return isCenteredRow && _isCenteredRoomColumnX(room, waypoint.position.x);
}

function _createClaimedWaypointKeys(room:ReturnType<typeof findCurrentRoom>, activityStartTime:number, context:ActivityContext):Set<string> {
  const claimedWaypointKeys = new Set<string>();

  for (const characterId of context.charactersById.keys()) {
    const state = context.characterStatesById.get(characterId) || null;
    if (!state?.isVisible) continue;
    const position = findTargetPositionAtTime(characterId, activityStartTime,
      context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
    if (!position) continue;
    const characterRoom = findCurrentRoom(context.level, position);
    if (characterRoom.id !== room.id) continue;
    const waypoint = findNearestWaypointToPosition(room, position);
    claimedWaypointKeys.add(_createWaypointKey(waypoint));
  }

  const roomItems = context.roomItemsByRoomId.get(room.id) || [];
  roomItems
    .filter(item => item.isVisible)
    .forEach(item => claimedWaypointKeys.add(_createWaypointKey(findNearestWaypointToPosition(room, item.position))));

  return claimedWaypointKeys;
}

function _scoreDropWaypoint(room:ReturnType<typeof findCurrentRoom>, sourceWaypoint:Waypoint, candidateWaypoint:Waypoint,
  claimedWaypointKeys:Set<string>):number|null {
  if (Math.abs(candidateWaypoint.position.y - sourceWaypoint.position.y) > FLOOR_WAYPOINT_Y_OFFSET) return null;
  if (_isExitWaypoint(room, candidateWaypoint)) return null;
  if (!_isColRowCenteredWaypoint(room, candidateWaypoint)) return null;

  let score = 0;
  if (!claimedWaypointKeys.has(_createWaypointKey(candidateWaypoint))) score += 100;
  if (candidateWaypoint.position.z === WAYPOINT_BACK_ROW_Z) score += 50;
  if (candidateWaypoint.position.z === WAYPOINT_FRONT_ROW_Z) score += 30;
  if (_findWaypointColumnIndex(room, candidateWaypoint) >= 2) score += 10;
  if (_isOrthogonalToSource(sourceWaypoint, candidateWaypoint)) score += 5;
  return score;
}

function _chooseBestDropWaypoint(room:ReturnType<typeof findCurrentRoom>, sourceWaypoint:Waypoint,
  activityStartTime:number, context:ActivityContext):Waypoint {
  const claimedWaypointKeys = _createClaimedWaypointKeys(room, activityStartTime, context);
  const scoredWaypoints = sourceWaypoint.adjacentWaypoints
    .map(waypoint => ({ waypoint, score:_scoreDropWaypoint(room, sourceWaypoint, waypoint, claimedWaypointKeys) }))
    .filter((entry):entry is { waypoint:Waypoint, score:number } => entry.score !== null);
  if (!scoredWaypoints.length) return sourceWaypoint; // It looks a bit ugly, but character can drop it at their feet.

  return scoredWaypoints.reduce((bestEntry, entry) => {
    if (entry.score !== bestEntry.score) return entry.score > bestEntry.score ? entry : bestEntry;
    if (entry.waypoint.position.x !== bestEntry.waypoint.position.x) {
      return entry.waypoint.position.x < bestEntry.waypoint.position.x ? entry : bestEntry;
    }
    if (entry.waypoint.position.z !== bestEntry.waypoint.position.z) {
      return entry.waypoint.position.z < bestEntry.waypoint.position.z ? entry : bestEntry;
    }
    if (entry.waypoint.position.y !== bestEntry.waypoint.position.y) {
      return entry.waypoint.position.y < bestEntry.waypoint.position.y ? entry : bestEntry;
    }
    return bestEntry;
  }).waypoint;
}

function _createDroppedItemPosition(room:ReturnType<typeof findCurrentRoom>, dropWaypoint:Waypoint, roomItems:Item[]) {
  const stackedItems = roomItems.filter(item => item.position.x === dropWaypoint.position.x && item.position.z === dropWaypoint.position.z);
  const topItemY = stackedItems.reduce((topY, candidate) => Math.min(topY, candidate.position.y), dropWaypoint.position.y);
  return {
    x:dropWaypoint.position.x,
    y:stackedItems.length > 0 ? topItemY - calcItemCuboidHeightGame(room) : dropWaypoint.position.y,
    z:dropWaypoint.position.z
  };
}

function _createZeroDrawOffset():Item['drawOffset'] {
  return { x:0, y:0, z:0 };
}

function _findParenthesizedTrailingTupleText(text:string):string|null {
  if (!text.endsWith(')')) return null;
  const openParenIndex = text.lastIndexOf('(');
  if (openParenIndex === -1) return null;
  return text.slice(openParenIndex + 1, -1);
}

function _parseDrawOffsetNumber(text:string, activityText:string):number {
  const value = Number(text.trim());
  if (Number.isNaN(value)) throw new Error(`invalid drop drawOffset number '${text.trim()}' in itinerary activity '${activityText}'`);
  return value;
}

function _splitParenthesizedTupleNumbers(tupleText:string):string[] {
  if (tupleText.includes(',')) return tupleText.split(',').map(text => text.trim()).filter(Boolean);
  return tupleText.trim().split(/\s+/).filter(Boolean);
}

function _parseDropParts(activityText:string):ParsedDropParts {
  const dropText = stripTrailingPeriod(activityText.trim().slice('drops'.length).trim());
  if (!dropText.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);
  const trailingTupleText = _findParenthesizedTrailingTupleText(dropText);
  if (!trailingTupleText) return { itemRef:dropText, drawOffset:_createZeroDrawOffset() };

  const openParenIndex = dropText.lastIndexOf('(');
  const itemRef = dropText.slice(0, openParenIndex).trim();
  if (!itemRef.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);
  const numberTexts = _splitParenthesizedTupleNumbers(trailingTupleText);
  if (numberTexts.length !== 3) throw new Error(`drop drawOffset must be in the form '(x, y, z)' in itinerary activity '${activityText}'`);

  return {
    itemRef,
    drawOffset:{
      x:_parseDrawOffsetNumber(numberTexts[0], activityText),
      y:_parseDrawOffsetNumber(numberTexts[1], activityText),
      z:_parseDrawOffsetNumber(numberTexts[2], activityText)
    }
  };
}

export function tryCreateDropActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('drops ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { itemRef, drawOffset } = _parseDropParts(trimmedActivityText);

  const item = removeStateOwnedItem(context.state, itemRef);
  if (!item) throw new Error(`item ${itemRef} is not carried for drop activity`);

  const room = findCurrentRoom(context.level, context.state.position);
  const roomItems = context.roomItemsByRoomId.get(room.id) || null;
  if (!roomItems) throw new Error(`missing room items for drop activity '${activityText}'`);
  const dropWaypoint = _chooseBestDropWaypoint(room, context.state.waypoint, activityStartTime, context);
  const droppedItem = {
    ...item,
    position:_createDroppedItemPosition(room, dropWaypoint, roomItems),
    drawOffset
  };
  roomItems.push(droppedItem);

  return [createDropItemEvent(activityStartTime, droppedItem.id, droppedItem.position, droppedItem.drawOffset)];
}
