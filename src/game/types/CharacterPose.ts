import { BodyOrientation, FacingDirection } from "./Character"
import Position, { createDefaultPosition, duplicatePosition } from "./Position"

type CharacterPose = {
  position:Position,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  speech:string|null,
  thought:string|null
}

export function duplicateCharacterPose(from:CharacterPose):CharacterPose {
  return {
    position:duplicatePosition(from.position),
    facingDirection:from.facingDirection,
    bodyOrientation:from.bodyOrientation,
    speech:from.speech,
    thought:from.thought
  };
}

export function createDefaultCharacterPose():CharacterPose {
  return {
    position:createDefaultPosition(),
    facingDirection:'right',
    bodyOrientation:'standing',
    speech:null,
    thought:null
  }
}

export default CharacterPose;