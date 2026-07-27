import Itinerary from "./Itinerary";
import ItineraryIndex, { createDefaultItineraryIndex } from "./ItineraryIndex";
import Item, { duplicateItem } from "./Item";
import Position, { duplicatePosition } from "./Position";
import Waypoint, { createDefaultWaypoint } from "./Waypoint";
import { createDefaultCharacterPose } from "./CharacterPose";

export type FacingDirection = 'left' | 'right';
export const VALID_FACING_DIRECTIONS:FacingDirection[] = ['left', 'right'];
export const DEFAULT_FACING_DIRECTION:FacingDirection = 'right';
export type BodyOrientation = 'standing' | 'sitting' | 'kneeling' | 'laying';
export const VALID_BODY_ORIENTATIONS:BodyOrientation[] = ['standing', 'sitting', 'kneeling', 'laying'];
export const DEFAULT_BODY_ORIENTATION:BodyOrientation = 'standing';

/* If adding new members to Character, consider if these should also be part of CharacterPose.
   And if you decide to add them to CharacterPose, then make updates to createDefaultCharacter() to
   populate members from createDefaultCharacterPose() following the pattern. In this way, we will
   keep consistency in dynamic state rebuilding. */
type Character = {
  readonly id:string,
  readonly title:string,
  readonly faceImageUrl:string|null,
  readonly randomSalt:number,
  isDiscovered:boolean,
  isVisible:boolean,
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
  pairedItinerary:Itinerary|null,
  isPairingKnown:boolean,
  itineraryIndex:ItineraryIndex
}

export function createDefaultCharacter():Character {
  const defaultPose = createDefaultCharacterPose();
  return {
    id:'character',
    title:'Character',
    faceImageUrl:null,
    randomSalt:0,
    isDiscovered:false,
    isVisible:true,
    facingDirection:defaultPose.facingDirection,
    bodyOrientation:defaultPose.bodyOrientation,
    isTitleKnown:true,
    description:'',
    items:[],
    leftHandItem:null,
    rightHandItem:null,
    position:defaultPose.position,
    waypoint:createDefaultWaypoint(),
    discoveredRoomIds:[],
    itinerary:[],
    pairedItinerary:null,
    isPairingKnown:false,
    itineraryIndex:createDefaultItineraryIndex()
  };
}

export function duplicateCharacter(from:Character):Character {
  return {
    id:from.id,
    title:from.title,
    faceImageUrl:from.faceImageUrl,
    randomSalt:from.randomSalt,
    isDiscovered:from.isDiscovered,
    isVisible:from.isVisible,
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
    pairedItinerary:from.pairedItinerary,
    isPairingKnown:from.isPairingKnown,
    itineraryIndex:from.itineraryIndex
  };
}

export default Character;