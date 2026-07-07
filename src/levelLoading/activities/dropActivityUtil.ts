/* This module groups drop-activity parsing and drop-target waypoint selection during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item from "@/game/types/Item";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createDropItemEvent } from "@/game/itineraryUtil";
import { normalizeId } from "@/game/idUtil";
import { calcItemCuboidHeightGame } from "@/game/itemSizeUtil";
import { roomWidthToColumnCount } from "@/game/roomGridUtil";
import { findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z, WAYPOINT_FRONT_ROW_Z, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { removeStateOwnedItem } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { stripTrailingPeriod } from "./activity/activityTextParseUtil";
import { findRoomNearestToPosition } from "@/game/roomUtil";
import Room from "@/game/types/Room";

type ParsedDropParts = {
  itemRef:string,
  targetRef:string|null
};

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _isExitWaypoint(room:Room, waypoint:Waypoint):boolean {
  return waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && room.exits.some(exit => exit.x === waypoint.position.x && exit.y === waypoint.position.y);
}

function _isOrthogonalToSource(sourceWaypoint:Waypoint, candidateWaypoint:Waypoint):boolean {
  return (candidateWaypoint.position.x === sourceWaypoint.position.x)
    !== (candidateWaypoint.position.z === sourceWaypoint.position.z);
}

function _findWaypointColumnIndex(room:Room, waypoint:Waypoint):number {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  return Math.floor((waypoint.position.x - room.rect.x) / columnWidth);
}

function _isCenteredRoomColumnX(room:Room, x:number):boolean {
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const columnIndex = Math.floor((x - room.rect.x) / columnWidth);
  const centeredX = room.rect.x + (columnIndex + 0.5) * columnWidth;
  return Math.abs(x - centeredX) <= FLOOR_WAYPOINT_Y_OFFSET;
}

function _isColRowCenteredWaypoint(room:Room, waypoint:Waypoint):boolean {
  const isCenteredRow = waypoint.position.z === WAYPOINT_BACK_ROW_Z
    || waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    || waypoint.position.z === WAYPOINT_FRONT_ROW_Z;
  return isCenteredRow && _isCenteredRoomColumnX(room, waypoint.position.x);
}

function _createClaimedWaypointKeys(room:Room, activityStartTime:number, context:ActivityContext):Set<string> {
  const claimedWaypointKeys = new Set<string>();

  for (const characterId of context.charactersById.keys()) {
    const state = context.characterStatesById.get(characterId) || null;
    if (!state?.isVisible) continue;
    const position = findTargetPositionAtTime(characterId, activityStartTime,
      context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
    if (!position) continue;
    const characterRoom = findRoomNearestToPosition(context.level.rooms, position.x, position.y);
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

function _scoreDropWaypoint(room:Room, sourceWaypoint:Waypoint, candidateWaypoint:Waypoint,
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

function _chooseBestDropWaypoint(room:Room, sourceWaypoint:Waypoint,
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

function _createDroppedItemPosition(room:Room, dropWaypoint:Waypoint, roomItems:Item[]) {
  const stackedItems = roomItems.filter(item => item.position.x === dropWaypoint.position.x && item.position.z === dropWaypoint.position.z);
  const topItemY = stackedItems.reduce((topY, candidate) => Math.min(topY, candidate.position.y), dropWaypoint.position.y);
  return {
    x:dropWaypoint.position.x,
    y:stackedItems.length > 0 ? topItemY - calcItemCuboidHeightGame(room) : dropWaypoint.position.y,
    z:dropWaypoint.position.z
  };
}

function _parseDropParts(activityText:string):ParsedDropParts {
  const dropText = stripTrailingPeriod(activityText.trim().slice('drops'.length).trim());
  if (!dropText.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);
  const separatorIndex = dropText.lastIndexOf(' on ');
  if (separatorIndex === -1 && /\s+on$/i.test(dropText)) {
    throw new Error(`missing item or target in itinerary activity '${activityText}'`);
  }
  if (separatorIndex === -1) return { itemRef:dropText, targetRef:null };
  if (separatorIndex <= 0 || separatorIndex >= dropText.length - ' on '.length) {
    throw new Error(`missing item or target in itinerary activity '${activityText}'`);
  }

  const itemRef = stripTrailingPeriod(dropText.slice(0, separatorIndex).trim());
  const targetRef = stripTrailingPeriod(dropText.slice(separatorIndex + ' on '.length).trim());
  if (!itemRef || !targetRef) throw new Error(`missing item or target in itinerary activity '${activityText}'`);
  return { itemRef, targetRef };
}

function _findDropTargetWaypoint(room:Room, activityStartTime:number,
  targetRef:string, context:ActivityContext, activityText:string):Waypoint {
  const targetPosition = findTargetPositionAtTime(normalizeId(targetRef), activityStartTime,
    context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
  if (!targetPosition) throw new Error(`unknown drop target '${targetRef}' in itinerary activity '${activityText}'`);
  const targetRoom = findRoomNearestToPosition(context.level.rooms, targetPosition.x, targetPosition.y);
  if (targetRoom.id !== room.id) throw new Error(`drop target ${targetRef} is not in the same room for drop activity`);
  return findNearestWaypointToPosition(room, targetPosition);
}

export function tryCreateDropActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('drops ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { itemRef, targetRef } = _parseDropParts(trimmedActivityText);

  const item = removeStateOwnedItem(context.state, itemRef);
  if (!item) throw new Error(`item ${itemRef} is not carried for drop activity`);

  const { x, y } = context.state.position;
  const room = findRoomNearestToPosition(context.level.rooms, x, y);
  const roomItems = context.roomItemsByRoomId.get(room.id) || null;
  if (!roomItems) throw new Error(`missing room items for drop activity '${activityText}'`);
  const dropWaypoint = targetRef
    ? _findDropTargetWaypoint(room, activityStartTime, targetRef, context, activityText)
    : _chooseBestDropWaypoint(room, context.state.waypoint, activityStartTime, context);
  const droppedItem = {
    ...item,
    position:_createDroppedItemPosition(room, dropWaypoint, roomItems)
  };
  roomItems.push(droppedItem);

  return [createDropItemEvent(activityStartTime, droppedItem.id, droppedItem.position, droppedItem.drawOffset)];
}
