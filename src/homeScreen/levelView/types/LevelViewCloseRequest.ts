import type InitialClosedFrameHandoff from './InitialClosedFrameHandoff';

/** Pending close notification; false completion means unmount cancelled the wait. */
type LevelViewCloseRequest = InitialClosedFrameHandoff & Readonly<{
  promise:Promise<boolean>,
  resolve:(isClosed:boolean) => void
}>;

export default LevelViewCloseRequest;