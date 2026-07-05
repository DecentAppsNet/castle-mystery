import { BodyOrientation, FacingDirection } from "./Character"
import Position, { duplicatePosition } from "./Position"

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
    position:{x:0, y:0, z:0},
    facingDirection:'right',
    bodyOrientation:'standing',
    speech:null,
    thought:null
  }
}

export default CharacterPose;