/* This file exposes the static definition and pure geometry API for character bodies.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

export { createDefaultCharacterBody, getHeadImageUrl, replaceHeadImage } from './characterBodyDefinitionUtil';
export { createRasterCharacterBody } from './rasterBodyDefinitionUtil';
export { getArmThickness } from './characterArmGeometryUtil';
export { createBodyCanvasLayout } from './characterBodyLayoutUtil';
export { fitHeadImage, calcHeadImageBounds, rotateHeadPose } from './characterHeadGeometryUtil';
export { composeBodyTransforms, createBodyAttachmentTransform, transformBodyPoint, transformBodyRect } from './characterBodyTransformUtil';
export { createBodyPose, getBodyPaintOrder, getBodyBounds, getResolvedBodyPart, resolveBodyHierarchy, getViewerArmPartKind } from './characterBodyPoseUtil';