/* This module groups shared time-unit constants used for timestamp and duration calculations.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR;
export const SECS_IN_MINUTE = 60;
export const SECS_IN_HOUR = SECS_IN_MINUTE * MINUTES_IN_HOUR;
export const SECS_IN_DAY = SECS_IN_HOUR * HOURS_IN_DAY;
export const MSECS_IN_SECOND = 1000;
export const MSECS_IN_MINUTE = SECS_IN_MINUTE * MSECS_IN_SECOND;
export const MSECS_IN_DAY = MINUTES_IN_DAY * MSECS_IN_MINUTE;