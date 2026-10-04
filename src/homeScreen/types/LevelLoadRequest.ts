/** HomeScreen-owned level request lifetime, independent of curtain animation. */
type LevelLoadRequest = {
  /** Null when idle; additional requests reuse this promise and their selections are ignored. */
  pending:Promise<void>|null,
  isMounted:boolean
};

export default LevelLoadRequest;