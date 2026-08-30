import EffectHandler from "./EffectHandler";

type EffectKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'says' | 'thinks' | 'emits' | 'takeItem' | 'unlockExit';

/* Effect is meant as a small, general, non-discriminated type. Its members should apply to all or most effects.
   There are other conventions to use for getting information to the effect handler:
   
   * Passing values to the create*Effect() function and currying them to an internal handler function.
   * Generating values within the create*Effect() function and currying them to an internal handler function.
   * Passing values through the EffectDrawCall discriminated union type.
   
   The first two ways can be used during level loading. The last way can be used at game time.
*/
type Effect = {
  kind:EffectKind,
  startTime:number,
  endTime:number,
  handler:EffectHandler|null
}

export function duplicateEffect(from:Effect):Effect {
  return {...from}
}

export default Effect;