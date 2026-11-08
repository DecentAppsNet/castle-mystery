import ImageSet from "@/game/types/ImageSet";
import ControlLayout from "@/canvasControls/types/ControlLayout";
import { createLayout, findControlAtPoint } from "@/canvasControls";
import { drawOverlayIcons, updateOverlayIconsLayout } from "./iconUtil";
import { assert, assertNonNullable } from "decent-portal";
import OverlayControlId from "./types/OverlayControlId";

export { BOOK_ICON_IMAGE_URL } from "./iconUtil";

// The singleton is fine as long as the game isn't rendered with multiple instances.
let theLayout:ControlLayout|null = null;

function _updateTheLayoutAsNeeded(canvasWidth:number, canvasHeight:number, imageSet:ImageSet) {
  // If canvas width/height the same, an existing layout can be reused.
  if (theLayout && theLayout.canvasWidth === canvasWidth && theLayout.canvasHeight === canvasHeight) return;
  
  // It is possible for the imageSet instance to change or for its membership of images to change, 
  // but all images currently used for layout are UI assets with fixed dimensions. The moment this changes,
  // (e.g. layout calculation rely on knowing dimensions of character heads for the current level) the check for
  // changes should also check for changes in imageSet to trigger layout recalcs.

  theLayout = createLayout(canvasWidth, canvasHeight);
  updateOverlayIconsLayout(theLayout, imageSet);
}

export function drawOverlay(imageSet:ImageSet, context:CanvasRenderingContext2D):void {
  _updateTheLayoutAsNeeded(context.canvas.width, context.canvas.height, imageSet);
  assertNonNullable(theLayout);
  drawOverlayIcons(theLayout, imageSet, context);
}

export function findOverlayControlAtPoint(canvasX:number, canvasY:number):OverlayControlId|null {
  // Not worth adding more handling to cover this edge case. Just wait for drawOverlay() to get called.
  if (!theLayout) return null; 

  // Also not worth handling the edge case where canvas dimensions change immediately before this call.
  // The layout will be stale for a period of time imperceptible to a human.

  const controlId = findControlAtPoint(theLayout, canvasX, canvasY);
  assert(controlId === null || controlId === 'book');
  return controlId as OverlayControlId|null;
}