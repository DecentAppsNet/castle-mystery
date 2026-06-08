import Character from "@/game/types/Character";
import EffectBase from "./EffectBase";

export type TalkingDip = Readonly<{
  startTimeOffset:number,
  peakAngleOffsetRadians:number,
  returnDurationMsecs:number
}>;

type TalkingEffect = EffectBase & {
  character:Character,
  speechStartTime:number,
  speechEndTime:number,
  gameTime:number,
  dips:TalkingDip[]
}

export default TalkingEffect;