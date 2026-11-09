/* This file provides temporary book page-flip preview animation helpers.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Visual animation preview glue is verified manually. @preserve */

import BookState from "../types/BookState";

const PAGE_FLIP_ANIMATION_DURATION = 200;

export function startPageFlipPreview(metaTime:number, bookState:BookState, kind:'flipPrev'|'flipNext') {
  if (!bookState.isVisible || !bookState.layout || bookState.animationKind !== null) return;

  bookState.animationKind = kind;
  bookState.animationStartMetaTime = metaTime;
  bookState.animationDuration = PAGE_FLIP_ANIMATION_DURATION;
  bookState.onAnimationEnd = null;
}