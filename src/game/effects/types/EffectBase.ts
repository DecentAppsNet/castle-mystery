import Effect from "./Effect";
import EffectDrawStage from "./EffectDrawStage";

type EffectKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'speech' | 'takeItem' | 'unlockExit';

export type EffectHandler = (drawStage:EffectDrawStage, effect:Effect, context:CanvasRenderingContext2D, time:number, metaTime:number, effectSetup:any) => void;

type EffectBase = {
  kind:EffectKind,
  startTime:number,
  endTime:number,
  handler:EffectHandler|null
}

export default EffectBase;