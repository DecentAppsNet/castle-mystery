/* This file estimates speech duration for scheduling and formats speech verbs for loading diagnostics.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_SECOND } from "@/common/timeUtil";

const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

export type SpeechVerb = 'says'|'thinks';

/** Converts a known speech activity verb to its gerund form. */
export function speechVerbToGerund(verb:SpeechVerb):string {
  return verb === 'says' ? 'saying' : 'thinking';
}

/** Estimates speech duration from text length with a minimum duration. */
export function calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}