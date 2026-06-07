import Character from "@/game/types/Character";
import ImageSet from "@/game/types/ImageSet";
import Room from "@/game/types/Room";
import ScalingFactors from "@/game/types/ScalingFactors";
import EffectType from "./EffectType";
import type Effect from "./Effect";

export type ProcessLevelEffectCallback = (effect:Effect, context:CanvasRenderingContext2D) => boolean;
export type ProcessRoomEffectCallback = (room:Room, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean, imageSet:ImageSet) => boolean;
export type ProcessCharacterEffectCallback = (character:Character, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, imageSet:ImageSet) => boolean;

type EffectBase = {
  type:EffectType,
  room?:Room,
  character?:Character,
  drawsBefore?:boolean,
  onProcessLevelEffect?:ProcessLevelEffectCallback,
  onProcessRoomEffect?:ProcessRoomEffectCallback,
  onProcessCharacterEffect?:ProcessCharacterEffectCallback,
  startTime:number
}

export default EffectBase;
