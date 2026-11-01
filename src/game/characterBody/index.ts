/* This file exposes the static definition and pure geometry API for character bodies.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export { createDefaultCharacterBody, getHeadImageUrl, replaceHeadImage } from './characterBodyDefinitionUtil';
export { createRasterCharacterBody } from './rasterBodyDefinitionUtil';
export { getArmThickness } from './characterArmGeometryUtil';
export { createBodyCanvasLayout, createVisualBodyLayout } from './characterBodyLayoutUtil';
export { fitHeadImage, calcHeadImageBounds } from './characterHeadGeometryUtil';
export { createCanvasAttachmentTransform, transformBodyPoint, transformBodyRect } from './characterBodyTransformUtil';
export { createBodyPose, getBodyPaintOrder, getBodyBounds, getResolvedBodyPart, getViewerArmPartKind, getHandArmPartKind } from './characterBodyPoseUtil';