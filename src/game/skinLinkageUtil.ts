/* This file derives skin-discovery linkages from visible character appearance changes.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";
import { SkinLinkages } from "./types/DiscoveryState";
import TimelineKeyframe from "./types/TimelineKeyframe";
import Room from "./types/Room";
import { findRoomAtPosition } from "./roomUtil";

function _addSkinLinkage(skinId1:string, skinId2:string, linkages:SkinLinkages) {
  let skinIdSet:Set<string> = linkages[skinId1];
  if (!skinIdSet) {
    skinIdSet = new Set<string>;
    skinIdSet.add(skinId1); // Linking a skin ID to itself simplifies common case of code that checks for both things, and is harmless in other cases.
    linkages[skinId1] = skinIdSet;
  }
  skinIdSet.add(skinId2);
}

function _addSkinLinkagePair(skinId1:string, skinId2:string, linkages:SkinLinkages) {
  assert(skinId1 !== skinId2);
  _addSkinLinkage(skinId1, skinId2, linkages);
  _addSkinLinkage(skinId2, skinId1, linkages);
}

/** Creates bidirectional skin links for appearance changes witnessed outside obscured rooms. */
export function createRevealedSkinLinkages(keyframes:TimelineKeyframe[], baseRooms:Room[], obscuredRoomIds:Set<string>):SkinLinkages {
  assert(keyframes.length > 0);
  const linkages:SkinLinkages = {};
  const characterCount = keyframes[0].characters.length;
  for(let characterI = 0; characterI < characterCount; ++characterI) {
    let previousSkinId = keyframes[0].characters[characterI].skinId;
    _addSkinLinkage(previousSkinId, previousSkinId, linkages); // Self-link.
    for(let keyframeI = 1; keyframeI < keyframes.length; ++keyframeI) {
      const skinId = keyframes[keyframeI].characters[characterI].skinId;
      if (skinId === previousSkinId) continue;
      const { position } = keyframes[keyframeI].characters[characterI];
      const room = findRoomAtPosition(baseRooms, position.x, position.y);
      assertNonNullable(room);
      if (!obscuredRoomIds.has(room.id)) {
        _addSkinLinkagePair(skinId, previousSkinId, linkages);
      } else {
        _addSkinLinkage(skinId, skinId, linkages); // Create an isolated entry for this new skin ID if it doesn't exist already.
      }
      previousSkinId = skinId;
    }
  }
  return linkages;
}

export function areSkinIdsLinked(skinLinkages:SkinLinkages, skinId1:string, skinId2:string):boolean {
  const skinIdSet = skinLinkages[skinId1];
  return (skinIdSet && skinIdSet.has(skinId2));
}