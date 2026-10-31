/* This file groups fixed time-unit constants for timestamp and duration calculations, not calendar or daylight-saving arithmetic.
	If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

const MINUTES_IN_HOUR = 60;
/** Hours in a fixed 24-hour day. */
export const HOURS_IN_DAY = 24;
/** Minutes in a fixed 24-hour day. */
export const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR;
/** Seconds in a minute. */
export const SECS_IN_MINUTE = 60;
/** Seconds in an hour. */
export const SECS_IN_HOUR = SECS_IN_MINUTE * MINUTES_IN_HOUR;
/** Seconds in a fixed 24-hour day. */
export const SECS_IN_DAY = SECS_IN_HOUR * HOURS_IN_DAY;
/** Milliseconds in a second. */
export const MSECS_IN_SECOND = 1000;
/** Milliseconds in a minute. */
export const MSECS_IN_MINUTE = SECS_IN_MINUTE * MSECS_IN_SECOND;
/** Milliseconds in a fixed 24-hour day. */
export const MSECS_IN_DAY = MINUTES_IN_DAY * MSECS_IN_MINUTE;