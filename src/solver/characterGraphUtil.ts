/* This module builds the character co-presence graph for a level (see docs/adr-solver.md).

  An edge means two characters were in the same room at the same time. We recompute co-presence
  directly here rather than reusing CharacterEncounterEvents, because those deliberately ignore
  characters who are already together at the start of the level (they only mark *new* encounters).

  A character's room only changes at ROOM_ENTRY events, so sampling co-presence at the level start
  time plus every ROOM_ENTRY tick captures every room-occupancy configuration. */

import { findCharacterPose } from "@/game/itineraryUtil";
import { findRoomAtPosition } from "@/game/roomUtil";
import Character from "@/game/types/Character";
import Level from "@/game/types/Level";
import Room from "@/game/types/Room";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import CharacterGraph, { CharacterGraphEdge, CharacterGraphNode } from "./types/CharacterGraph";

function _compareIds(id1:string, id2:string):number {
  return id1.localeCompare(id2);
}

function _createEdgeKey(sourceId:string, targetId:string):string {
  // JSON encoding is collision-proof regardless of id contents (normalized ids may contain spaces).
  return JSON.stringify([sourceId, targetId]);
}

function _collectSampleTimes(characters:Character[], startTime:number):number[] {
  const times = new Set<number>([startTime]);
  characters.forEach(character => {
    character.itinerary.forEach(event => {
      if (event.type === ItineraryEventType.ROOM_ENTRY) times.add(event.startTime);
    });
  });
  return [...times].sort((time1, time2) => time1 - time2);
}

function _roomIdAtTime(character:Character, rooms:Room[], time:number):string|null {
  const pose = findCharacterPose(character, time);
  const room = findRoomAtPosition(rooms, pose.position.x, pose.position.y);
  return room ? room.id : null;
}

function _createCharacterIdsByRoomId(characters:Character[], rooms:Room[], time:number):Map<string, string[]> {
  const idsByRoomId = new Map<string, string[]>();
  characters.forEach(character => {
    const roomId = _roomIdAtTime(character, rooms, time);
    if (!roomId) return;
    const ids = idsByRoomId.get(roomId) ?? [];
    ids.push(character.id);
    idsByRoomId.set(roomId, ids);
  });
  idsByRoomId.forEach(ids => ids.sort(_compareIds));
  return idsByRoomId;
}

function _createNode(character:Character, activeCharacterId:string):CharacterGraphNode {
  return {
    id:character.id,
    title:character.title,
    isTitleKnown:character.isTitleKnown,
    isActiveStart:character.id === activeCharacterId
  };
}

export function buildCharacterGraph(characters:Character[], rooms:Room[], startTime:number, activeCharacterId:string):CharacterGraph {
  const nodes = characters.map(character => _createNode(character, activeCharacterId));

  const edgesByKey = new Map<string, CharacterGraphEdge>();
  _collectSampleTimes(characters, startTime).forEach(time => {
    _createCharacterIdsByRoomId(characters, rooms, time).forEach((ids, roomId) => {
      for (let i = 0; i < ids.length; ++i) {
        for (let j = i + 1; j < ids.length; ++j) {
          const sourceId = ids[i], targetId = ids[j]; // ids are pre-sorted, so sourceId precedes targetId.
          const key = _createEdgeKey(sourceId, targetId);
          const edge = edgesByKey.get(key) ?? { sourceId, targetId, directed:false, coPresences:[] };
          edge.coPresences.push({ time, roomId });
          edgesByKey.set(key, edge);
        }
      }
    });
  });

  const edges = [...edgesByKey.values()].sort((edge1, edge2) =>
    _compareIds(edge1.sourceId, edge2.sourceId) || _compareIds(edge1.targetId, edge2.targetId));

  return { directed:false, nodes, edges };
}

export function buildCharacterGraphForLevel(level:Level):CharacterGraph {
  return buildCharacterGraph(level.characters, level.rooms, level.startTime, level.activeCharacterId);
}
