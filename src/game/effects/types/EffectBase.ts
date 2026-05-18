import Character from "@/game/types/Character";
import Room from "@/game/types/Room";
import EffectType from "./EffectType";
import type Effect from "./Effect";

export type ProcessLevelEffectCallback = (effect:Effect, context:CanvasRenderingContext2D) => boolean;
export type ProcessRoomEffectCallback = (room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean) => boolean;
export type ProcessCharacterEffectCallback = (character:Character, effect:Effect, context:CanvasRenderingContext2D) => boolean;

type EffectBase = {
  type:EffectType,
  room?:Room,
  character?:Character,
  onProcessLevelEffect?:ProcessLevelEffectCallback,
  onProcessRoomEffect?:ProcessRoomEffectCallback,
  onProcessCharacterEffect?:ProcessCharacterEffectCallback,
  startTime:number
}

export default EffectBase;
