const _startTimesByActivityName = new Map<string, number>();

function _findNow():number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

export function startTiming(activityName:string):void {
  if (_startTimesByActivityName.has(activityName)) {
    console.warn(`${activityName} timing already started; overwriting previous start time`);
  }
  _startTimesByActivityName.set(activityName, _findNow());
}

export function endTiming(activityName:string):void {
  const startTime = _startTimesByActivityName.get(activityName);
  if (startTime === undefined) {
    console.log(`${activityName} timing ended without a matching startTiming`);
    return;
  }

  _startTimesByActivityName.delete(activityName);
  console.log(`${activityName} took ${Math.round(_findNow() - startTime)}ms`);
}