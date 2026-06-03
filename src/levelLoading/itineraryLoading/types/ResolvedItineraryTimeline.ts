type ResolvedItineraryTimeline = Readonly<{
  earliestAbsoluteActivityTime:number|null,
  earliestResolvedActivityTime:number|null,
  latestResolvedActivityEndTime:number|null,
  latestResolvedEventEndTime:number|null
}>;

export default ResolvedItineraryTimeline;