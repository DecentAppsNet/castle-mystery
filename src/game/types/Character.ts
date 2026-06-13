import Itinerary from "./Itinerary";
import ItineraryIndex from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Position, { duplicatePosition } from "./Position";
import Waypoint from "./Waypoint";

export type FacingDirection = 'left' | 'right';
export type BodyOrientation = 'standing' | 'sitting' | 'kneeling' | 'laying';

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
  isAlive:boolean,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  isTitleKnown:boolean,
  description:string,
  items:Item[],
  leftHandItem:Item|null,
  rightHandItem:Item|null,
  position:Position,
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
    isAlive:true,
    facingDirection:'right',
    bodyOrientation:'standing',
    isTitleKnown:true,
    description:'',
    items:[],
    leftHandItem:null,
    rightHandItem:null,
    position:{ x:0, y:0, z:0 },
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
    isAlive:from.isAlive,
    facingDirection:from.facingDirection,
    bodyOrientation:from.bodyOrientation,
    isTitleKnown:from.isTitleKnown,
    description:from.description,
    items:from.items.map(duplicateItem),
    leftHandItem:from.leftHandItem ? duplicateItem(from.leftHandItem) : null,
    rightHandItem:from.rightHandItem ? duplicateItem(from.rightHandItem) : null,
    position:duplicatePosition(from.position),
    waypoint:from.waypoint,
    discoveredRoomIds:[...from.discoveredRoomIds],
    itinerary:from.itinerary,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;