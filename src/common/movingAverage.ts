/* This file maintains mutable rolling-average state for a bounded series of numeric samples.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

type MovingAverageData = {
  series:number[]
  seriesLength:number, 
  nextI:number; // Point to where next number in series will be added.
  lastAverage:number;
}

/** Creates empty rolling-average state; seriesLength must be a positive integer. */
export function createMovingAverage(seriesLength:number):MovingAverageData {
  assert(Number.isFinite(seriesLength) && seriesLength > 0);
  const series:number[] = [];
  return { series, nextI:0, lastAverage:0, seriesLength };
}

/** Adds a finite sample, mutates the state, and returns the average of the retained samples. */
export function updateMovingAverage(nextValue:number, mad:MovingAverageData):number {
  assert(Number.isFinite(nextValue));
  
  // While array is filling up, calc average with no values rolling off.
  if (mad.series.length < mad.seriesLength) {
    mad.series.push(nextValue);
    const valueCount = mad.series.length;
    mad.lastAverage += (nextValue - mad.lastAverage) / valueCount;
    return mad.lastAverage;
  }
  
  // After array is full, each added value will remove another.
  const oldValue = mad.series[mad.nextI];
  mad.series[mad.nextI] = nextValue;
  if (++mad.nextI === mad.seriesLength) mad.nextI = 0;
  mad.lastAverage += (nextValue - oldValue) / mad.seriesLength;
  return mad.lastAverage;
}