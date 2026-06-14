/* Serializes the timeline anachronisms a level has (see anachronismUtil.ts) two ways, mirroring the
  other solver serializers:
  - anachronismsToJsonObject(): the stable machine contract a level validator / the generative designer
    consumes.
  - renderAnachronismsAscii(): a deterministic, human-readable rendering the solver always produces, so
    the check is visible whether run from the CLI or programmatically. */

import { formatHoursMinutesSeconds } from "./labelUtil";
import TimelineAnachronism from "./types/TimelineAnachronism";

type AnachronismJson = {
  characterId:string,
  characterTitle:string,
  occupyingType:string,
  occupyingStartTime:number,
  occupyingEndTime:number,
  conflictingType:string,
  conflictingStartTime:number,
  conflictingEndTime:number,
  overlapMsecs:number
};

type AnachronismsJson = {
  level:string|null,
  anachronisms:AnachronismJson[],
  ok:boolean
};

export function anachronismsToJsonObject(anachronisms:TimelineAnachronism[], levelName:string|null = null):AnachronismsJson {
  return {
    level:levelName,
    anachronisms:anachronisms.map(anachronism => ({
      characterId:anachronism.characterId,
      characterTitle:anachronism.characterTitle,
      occupyingType:anachronism.occupying.type,
      occupyingStartTime:anachronism.occupying.startTime,
      occupyingEndTime:anachronism.occupying.endTime,
      conflictingType:anachronism.conflicting.type,
      conflictingStartTime:anachronism.conflicting.startTime,
      conflictingEndTime:anachronism.conflicting.endTime,
      overlapMsecs:anachronism.overlapMsecs
    })),
    ok:anachronisms.length === 0
  };
}

function _renderAnachronismLine(anachronism:TimelineAnachronism):string {
  const occupying = anachronism.occupying, conflicting = anachronism.conflicting;
  const overlapSeconds = (anachronism.overlapMsecs / 1000).toFixed(2);
  const conflictRange = `${formatHoursMinutesSeconds(conflicting.startTime)}-${formatHoursMinutesSeconds(conflicting.endTime)}`;
  const occupyingRange = `${formatHoursMinutesSeconds(occupying.startTime)}-${formatHoursMinutesSeconds(occupying.endTime)}`;
  return `  ! ${anachronism.characterTitle}: ${conflicting.type} (${conflictRange}) starts inside ${occupying.type} (${occupyingRange}) — overlap ${overlapSeconds}s`;
}

export function renderAnachronismsAscii(anachronisms:TimelineAnachronism[], levelName:string|null = null):string {
  const header = `Timeline anachronisms${levelName ? ` — ${levelName}` : ''}  (a character doing the same kind of activity twice at once)`;
  if (!anachronisms.length) return `${header}\n\n  none found\nRESULT: PASS\n`;
  return `${header}\n\n${anachronisms.map(_renderAnachronismLine).join('\n')}\nRESULT: FAIL\n`;
}
