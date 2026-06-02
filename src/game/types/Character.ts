/* This module groups the mutable character model and its defaulting or duplication helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Waypoint from "./Waypoint";

export type FacingDirection = 'left' | 'right';
export type BodyOrientation = 'standing' | 'sitting' | 'laying';

function _createDefaultWaypoint():Waypoint {
  return {
    position:{ x:0, y:0, z:0 },
    adjacentWaypoints:[],
    exitDirections:{}
  };
}

function _createDefaultItineraryIndex():ItineraryIndex {
  return {
    eventStartTimes:[],
    eventStartPositions:[],
    roomEntryStartTimes:[]
  };
}

type Character = {
  readonly id:string,
  readonly title:string,
  readonly faceImageUrl:string|null,
  readonly randomSalt:number,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  isTitleKnown:boolean,
  description:string,
  items:Item[],
  x:number,
  y:number,
  depth:number,
  waypoint:Waypoint,
  discoveredRoomIds:string[],
  itinerary:Itinerary,
  itineraryIndex:ItineraryIndex
}

export function createDefaultCharacter():Character {
  return {
    id:'character',
    title:'Character',
    faceImageUrl:null,
    randomSalt:0,
    facingDirection:'right',
    bodyOrientation:'standing',
    isTitleKnown:true,
    description:'',
    items:[],
    x:0,
    y:0,
    depth:0,
    waypoint:_createDefaultWaypoint(),
    discoveredRoomIds:[],
    itinerary:[],
    itineraryIndex:_createDefaultItineraryIndex()
  };
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    title:from.title,
    faceImageUrl:from.faceImageUrl,
    randomSalt:from.randomSalt,
    facingDirection:from.facingDirection,
    bodyOrientation:from.bodyOrientation,
    isTitleKnown:from.isTitleKnown,
    description:from.description,
    items:from.items.map(duplicateItem),
    x:from.x,
    y:from.y,
    depth:from.depth,
    waypoint:from.waypoint,
    discoveredRoomIds:[...from.discoveredRoomIds],
    itinerary:from.itinerary,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;