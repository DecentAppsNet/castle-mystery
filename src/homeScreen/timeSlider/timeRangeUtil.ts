import TimeRange from "./types/TimeRange";

export function isTimeInRanges(time:number, ranges:TimeRange[]):boolean {
  return ranges.some(range => range.startTime <= time && range.endTime > time);
}

// Returns a new array of time ranges with second set of ranges "subtracted" or removed
// from the first set of ranges. For performance reasons, original `ranges` param can be returned
// without duplication if it represents a result with no modifications, but no mutation is performed on params.
/* Key tests - move to unit test file.
  if first or second array is empty, first array is returned. (subtractRanges can't affect it)
  if both first and second array are non-empty, but no ranges overlap, first array is returned
  if a range doesn't intersect a subtract range it will be present without modification in return array.
  if a subtraction range exactly matches a range, it will be removed in return array.
  if a subtraction range extends outside boundaries of a range, it will be removed in return array
  if a subtraction range extends over two ranges, both will be removed in return array
  if a subtraction range overlaps the start of a range, but not end, the range will have startTime adjusted in return array
  if a subtraction range overlaps the end of a range, but not start, the range will have endTime adjusted in return array
*/
export function subtractRanges(ranges:TimeRange[], subtractRanges:TimeRange[]):TimeRange[] {
  let didSubtract = false;
  const remainingRanges = ranges.flatMap(range => subtractRanges.reduce<TimeRange[]>((remaining, subtractRange) => {
    return remaining.flatMap(remainingRange => {
      if (subtractRange.endTime <= remainingRange.startTime || subtractRange.startTime >= remainingRange.endTime) return [remainingRange];
      didSubtract = true;
      const before = { startTime:remainingRange.startTime, endTime:Math.min(remainingRange.endTime, subtractRange.startTime) };
      const after = { startTime:Math.max(remainingRange.startTime, subtractRange.endTime), endTime:remainingRange.endTime };
      return [before, after].filter(range => range.startTime < range.endTime);
    });
  }, [range]));
  return didSubtract ? remainingRanges : ranges;
}