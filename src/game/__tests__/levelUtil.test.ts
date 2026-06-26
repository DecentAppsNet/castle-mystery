// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import itineraryExtraPunctuationText from './fixtures/itinerary-extra-punctuation.md?raw';
import itinerarySortingText from './fixtures/itinerary-sorting.md?raw';
import afterPreviousActivityOverlapText from './fixtures/after-previous-activity-overlap.md?raw';
import afterPreviousActivityText from './fixtures/after-previous-activity.md?raw';
import lockUnlockActivityText from './fixtures/lock-unlock-activity.md?raw';
import lockNonadjacentRoomText from './fixtures/lock-nonadjacent-room.md?raw';
import lockNonlockableExitText from './fixtures/lock-nonlockable-exit.md?raw';
import unlockWrongSideText from './fixtures/unlock-wrong-side.md?raw';
import invalidAtRoomDestinationText from './fixtures/invalid-at-room-destination.md?raw';
import impossibleAtRoomArrivalText from './fixtures/impossible-at-room-arrival.md?raw';
import invalidItineraryActivityText from './fixtures/invalid-itinerary-activity.md?raw';
import invalidMapLegendTileText from './fixtures/invalid-map-legend-tile.md?raw';
import invalidRoomGridDimensionsText from './fixtures/invalid-room-grid-dimensions.md?raw';
import invalidRoomGridLegendEntryText from './fixtures/invalid-room-grid-legend-entry.md?raw';
import invalidRoomLegendTileText from './fixtures/invalid-room-legend-tile.md?raw';
import invalidItineraryTimestampText from './fixtures/invalid-itinerary-timestamp.md?raw';
import kingacideItineraryText from './fixtures/kingacide-itinerary.md?raw';
import kingacideMinifiedSnapshotText from './fixtures/kingacide-minified-snapshot.md?raw';
import emptyRoomTitleText from './fixtures/empty-room-title.md?raw';
import backgroundImageText from './fixtures/background-image.md?raw';
import facesCharacterTargetText from './fixtures/faces-character-target.md?raw';
import groundFloorRoomText from './fixtures/ground-floor-room.md?raw';
import invalidBackgroundImageText from './fixtures/invalid-background-image.md?raw';
import invalidClozeImageText from './fixtures/invalid-cloze-image.md?raw';
import invalidFaceImageText from './fixtures/invalid-face-image.md?raw';
import invalidItemImageText from './fixtures/invalid-item-image.md?raw';
import invalidGroundFloorRoomText from './fixtures/invalid-ground-floor-room.md?raw';
import itemImageText from './fixtures/item-image.md?raw';
import itemEmitsActivityText from './fixtures/item-emits-activity.md?raw';
import itemDrawOffsetText from './fixtures/item-draw-offset.md?raw';
import itemStackOffsetText from './fixtures/item-stack-offset.md?raw';
import outsideRoomMetadataText from './fixtures/outside-room-metadata.md?raw';
import outsideRoomBelowGroundFloorText from './fixtures/outside-room-below-ground-floor.md?raw';
import conclusionsCaseInsensitiveCategoriesText from './fixtures/conclusions-case-insensitive-categories.md?raw';
import conclusionsCategoryMatchesText from './fixtures/conclusions-category-matches.md?raw';
import duplicateUnlockText from './fixtures/duplicate-unlock.md?raw';
import duplicateCharacterSubsectionsCaseText from './fixtures/duplicate-character-subsections-case.md?raw';
import duplicateCharacterSubsectionsSpacesText from './fixtures/duplicate-character-subsections-spaces.md?raw';
import duplicateCharacterPlacementText from './fixtures/duplicate-character-placement.md?raw';
import duplicateCharacterPropertyText from './fixtures/duplicate-character-property.md?raw';
import characterIdWithSpacesRoomLegendText from './fixtures/character-id-with-spaces-room-legend.md?raw';
import conflictingExitModifiersText from './fixtures/conflicting-exit-modifiers.md?raw';
import audibleSpeechInterruptsText from './fixtures/audible-speech-interrupts.md?raw';
import audibleSpeechOverlapText from './fixtures/audible-speech-overlap.md?raw';
import duplicateGeneralEntryText from './fixtures/duplicate-general-entry.md?raw';
import duplicateGeneralSectionText from './fixtures/duplicate-general-section.md?raw';
import invalidActiveCharacterText from './fixtures/invalid-active-character.md?raw';
import invalidCharacterInventoryItemText from './fixtures/invalid-character-inventory-item.md?raw';
import invalidIsTitleKnownText from './fixtures/invalid-is-title-known.md?raw';
import missingMapSectionText from './fixtures/missing-map-section.md?raw';
import mapMissingGridText from './fixtures/map-missing-grid.md?raw';
import mapUnusedLegendEntryText from './fixtures/map-unused-legend-entry.md?raw';
import mapNonRectangularRoomText from './fixtures/map-non-rectangular-room.md?raw';
import mapRoomMissingFromRoomsSectionText from './fixtures/map-room-missing-from-rooms-section.md?raw';
import unknownTopLevelSectionText from './fixtures/unknown-top-level-section.md?raw';
import duplicateItemSubsectionsCaseText from './fixtures/duplicate-item-subsections-case.md?raw';
import duplicateItemIdInventoryText from './fixtures/duplicate-item-id-inventory.md?raw';
import duplicateMapLegendEntryText from './fixtures/duplicate-map-legend-entry.md?raw';
import duplicateRoomIdMapLegendText from './fixtures/duplicate-room-id-map-legend.md?raw';
import duplicateRoomLegendEntryText from './fixtures/duplicate-room-legend-entry.md?raw';
import duplicateRoomSubsectionsCaseText from './fixtures/duplicate-room-subsections-case.md?raw';
import doorsArrivalTimestampText from './fixtures/doors-arrival-timestamp.md?raw';
import invalidLockableExitItemText from './fixtures/invalid-lockable-exit-item.md?raw';
import invalidCeilingFloorExitText from './fixtures/invalid-ceiling-floor-exit.md?raw';
import invalidNonadjacentExitText from './fixtures/invalid-nonadjacent-exit.md?raw';
import lockRequiredItemInHandText from './fixtures/lock-required-item-in-hand.md?raw';
import lockRequiredItemMissingText from './fixtures/lock-required-item-missing.md?raw';
import unlockRequiredItemMissingText from './fixtures/unlock-required-item-missing.md?raw';
import duplicateConclusionCategoryGroupNamesText from './fixtures/duplicate-conclusion-category-group-names.md?raw';
import duplicateConclusionPropertyText from './fixtures/duplicate-conclusion-property.md?raw';
import duplicateConclusionSubsectionsCaseText from './fixtures/duplicate-conclusion-subsections-case.md?raw';
import loadLevelFromUrlWithImportsCharactersText from './fixtures/load-level-from-url-with-imports-characters.md?raw';
import loadLevelFromUrlWithImportsSalomoneCharactersText from './fixtures/load-level-from-url-with-imports-salomone-characters.md?raw';
import loadLevelFromUrlWithImportsSalomoneText from './fixtures/load-level-from-url-with-imports-salomone.md?raw';
import loadLevelFromUrlImportedDuplicateCharacterPropertySourceText from './fixtures/load-level-from-url-imported-duplicate-character-property-source.md?raw';
import loadLevelFromUrlImportedDuplicateCharacterPropertyText from './fixtures/load-level-from-url-imported-duplicate-character-property.md?raw';
import loadLevelFromUrlImportedDuplicateConclusionPropertySourceText from './fixtures/load-level-from-url-imported-duplicate-conclusion-property-source.md?raw';
import loadLevelFromUrlImportedDuplicateConclusionPropertyText from './fixtures/load-level-from-url-imported-duplicate-conclusion-property.md?raw';
import loadLevelFromUrlImportedDuplicateRoomLegendEntrySourceText from './fixtures/load-level-from-url-imported-duplicate-room-legend-entry-source.md?raw';
import loadLevelFromUrlImportedDuplicateRoomLegendEntryText from './fixtures/load-level-from-url-imported-duplicate-room-legend-entry.md?raw';
import loadLevelFromUrlWithImportsText from './fixtures/load-level-from-url-with-imports.md?raw';
import loadLevelFromUrlImportedItineraryText from './fixtures/load-level-from-url-imported-itinerary.md?raw';
import identitiesAllTitlesKnownText from './fixtures/identities-all-titles-known.md?raw';
import identitiesAuthoredMetadataText from './fixtures/identities-authored-metadata.md?raw';
import identitiesExcludesNoninteractiveCharactersText from './fixtures/identities-excludes-noninteractive-characters.md?raw';
import handItemDefaultCategoryText from './fixtures/hand-item-default-category.md?raw';
import inventoryItemDefaultCategoryText from './fixtures/inventory-item-default-category.md?raw';
import inventoryItemTitleCasingText from './fixtures/inventory-item-title-casing.md?raw';
import alphabetizedCharacterDefaultCategoryText from './fixtures/alphabetized-character-default-category.md?raw';
import noninteractiveCharacterDefaultCategoryText from './fixtures/noninteractive-character-default-category.md?raw';
import closedDoorExitText from './fixtures/closed-door-exit.md?raw';
import lockableExitOneSidedText from './fixtures/lockable-exit-one-sided.md?raw';
import lockableExitTwoSidedText from './fixtures/lockable-exit-two-sided.md?raw';
import lockableExitWithItemText from './fixtures/lockable-exit-with-item.md?raw';
import commaSeparatedExitsWithModifiersText from './fixtures/comma-separated-exits-with-modifiers.md?raw';
import lowercaseTitleDefaultsText from './fixtures/lowercase-title-defaults.md?raw';
import mapLegendRoomTitleDefaultText from './fixtures/map-legend-room-title-default.md?raw';
import missingConclusionPhraseText from './fixtures/missing-conclusion-phrase.md?raw';
import noPlacedCharactersText from './fixtures/no-placed-characters.md?raw';
import overlappingSameCharacterSpeechText from './fixtures/overlapping-same-character-speech.md?raw';
import overrideGeneratedCategoryGroupCaseText from './fixtures/override-generated-category-group-case.md?raw';
import overrideRoomsText from './fixtures/override-rooms.md?raw';
import conclusionsFallbackText from './fixtures/conclusions-fallback.md?raw';
import conclusionRevealRoomsText from './fixtures/conclusion-reveal-rooms.md?raw';
import conclusionUnlockConclusionsText from './fixtures/conclusion-unlock-conclusions.md?raw';
import shortDurationLabelsText from './fixtures/short-duration-labels.md?raw';
import stackedRoomItemsText from './fixtures/stacked-room-items.md?raw';
import invalidStackedMultipleCharactersText from './fixtures/invalid-stacked-multiple-characters.md?raw';
import conclusionsTwoSubsectionsText from './fixtures/conclusions-two-subsections.md?raw';
import titleDefaultsAndGeneratedIdentityText from './fixtures/title-defaults-and-generated-identity.md?raw';
import winSynopsisText from './fixtures/win-synopsis.md?raw';
import { clearSeed, setSeed } from '@/common/randUtil';
import { calcItemCuboidHeightGame } from '@/game/itemSizeUtil';
import { ITEM_EFFECT_DURATION } from '@/game/effects/dropItemUtil';
import LoadLevelException from '@/levelLoading/LoadLevelException';
import { loadLevelFromText, loadLevelFromUrl } from '@/levelLoading/levelUtil';
import { createGameState } from '../gameUtil';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { findCharacterPose } from '../itineraryUtil';
import { findRoom } from '../roomUtil';
import { FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from '../waypointUtil';
import ClozeBlank from '../conclusions/types/ClozeBlank';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import { LOCKABLE_WITHOUT_INV_CHECK } from '../types/RoomExit';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import atRoomMarkerText from '../integration-tests/fixtures/at-room-marker.md?raw';
import dropItemText from '../integration-tests/fixtures/drop-item.md?raw';
import giveItemNearText from '../integration-tests/fixtures/give-item-near.md?raw';
import giveItemRelativeTakeText from '../integration-tests/fixtures/give-item-relative-take.md?raw';
import wanderingTrappedText from '../integration-tests/fixtures/wandering-trapped.md?raw';
import conclusionsImageSeparatorText from './fixtures/conclusions-image-separator.md?raw';
import timelineStartTimeFieldText from './fixtures/timeline-start-time-field.md?raw';
import timelineBothTimeAndStartTimeText from './fixtures/timeline-both-time-and-start-time.md?raw';
import timelineExplicitEndSameDayText from './fixtures/timeline-explicit-end-same-day.md?raw';
import timelineCrossMidnightText from './fixtures/timeline-cross-midnight.md?raw';
import timelineEventOutsideWindowText from './fixtures/timeline-event-outside-window.md?raw';
import timelineDerivedBoundsText from './fixtures/timeline-derived-bounds.md?raw';
import timelineRelativeOnlyText from './fixtures/timeline-relative-only.md?raw';
import timelineInitialTimeOutsideBoundsText from './fixtures/timeline-initial-time-outside-bounds.md?raw';
import timelineStartAfterItineraryText from './fixtures/timeline-start-after-itinerary.md?raw';
import takeOccupiedLeftHandText from './fixtures/take-occupied-left-hand.md?raw';
import birthOfConstantineRegressionText from './fixtures/birth-of-constantine-regression.md?raw';
import escapeStairwellRegressionText from './fixtures/escape-stairwell-regression.md?raw';
import facesActivityText from './fixtures/faces-activity.md?raw';
import diesActivityText from './fixtures/dies-activity.md?raw';
import deadCharacterActivityText from './fixtures/dead-character-activity.md?raw';
import initiallyDeadCharacterActivityText from './fixtures/initially-dead-character-activity.md?raw';
import initialCharacterPoseText from './fixtures/initial-character-pose.md?raw';
import bodyOrientationActivityText from './fixtures/body-orientation-activity.md?raw';
import bodyOrientationOnItemActivityText from './fixtures/body-orientation-on-item-activity.md?raw';
import visibleFlagsText from './fixtures/visible-flags.md?raw';
import invalidCharacterVisibleText from './fixtures/invalid-character-visible.md?raw';
import invalidItemVisibleText from './fixtures/invalid-item-visible.md?raw';
import showHideActivityText from './fixtures/show-hide-activity.md?raw';
import unknownVisibilityTargetActivityText from './fixtures/unknown-visibility-target-activity.md?raw';
import { getClozeImageCandidateUrls, getItemImageAssetUrl, getRoomTextureAssetUrl } from '../imageUrlUtil';
import roomGridDepthText from './fixtures/room-grid-depth.md?raw';
import roomBackWallTextureText from './fixtures/room-back-wall-texture.md?raw';
import roomBackWallTextureDefaultCountsText from './fixtures/room-back-wall-texture-default-counts.md?raw';
import roomBackWallTextureFilterText from './fixtures/room-back-wall-texture-filter.md?raw';
import roomStyleTextureText from './fixtures/room-style-texture.md?raw';
import roomFloorTextureText from './fixtures/room-floor-texture.md?raw';
import roomRightWallTextureText from './fixtures/room-right-wall-texture.md?raw';
import { MSECS_IN_DAY } from '@/common/timeUtil';

describe('levelUtil itinerary loading', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('sorts timestamped activities instead of using file order', () => {
    const level = loadLevelFromText(itinerarySortingText);

    const hero = level.characters.find(character => character.id === 'hero');
    expect(hero?.itinerary.map(event => event.startTime)).toEqual([1_000, 2_000]);
  });

  it('starts the first colon-timestamped activity at time zero', () => {
    const level = loadLevelFromText(afterPreviousActivityText);
    const hero = level.characters.find(character => character.id === 'hero');
    const speechEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.SPEECH);
    const priorEvents = hero?.itinerary.filter(event => event.type !== ItineraryEventType.SPEECH) || [];
    const firstPriorEventStartTime = Math.min(...priorEvents.map(event => event.startTime));
    const priorCompletionTime = Math.max(0, ...priorEvents.map(event => event.startTime + event.duration));

    expect(firstPriorEventStartTime).toBe(0);
    expect(speechEvent?.startTime).toBe(priorCompletionTime);
  });

  it('chains colon timestamps from the previous activity completion time including overlapping events', () => {
    const level = loadLevelFromText(afterPreviousActivityOverlapText);
    const hero = level.characters.find(character => character.id === 'hero');
    const speechEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.SPEECH);
    const priorEvents = hero?.itinerary.filter(event => event.type !== ItineraryEventType.SPEECH) || [];
    const priorCompletionTime = Math.max(0, ...priorEvents.map(event => event.startTime + event.duration));
    const latestWalkEndTime = Math.max(0, ...priorEvents
      .filter(event => event.type === ItineraryEventType.WALK)
      .map(event => event.startTime + event.duration));

    expect(speechEvent?.startTime).toBe(priorCompletionTime);
    expect(priorCompletionTime).toBeGreaterThanOrEqual(latestWalkEndTime);
  });

  it('loads kingacide itinerary activities including title-based takes', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    const queen = level.characters.find(character => character.id === 'queen');
    const eastHall = level.rooms.find(room => room.id === 'east hall');
    const foyer = level.rooms.find(room => room.id === 'foyer');

    expect(queen?.items.map(item => item.id)).toContain('romance novel');
    expect(eastHall?.isObscured).toBe(true);
    expect(foyer?.isObscured).toBe(false);
    expect(level.conclusions.map(conclusion => conclusion.title)).toEqual(['Identities']);
  });

  it('parses immediate faces activities and applies their facing direction at the authored time', () => {
    const level = loadLevelFromText(facesActivityText);
    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');

    expect(king.itinerary.some(event => event.type === ItineraryEventType.FACE)).toBe(true);
    expect(findCharacterPose(king, 4_999).facingDirection).toBe('right');
    expect(findCharacterPose(king, 5_000).facingDirection).toBe('left');
  });

  it('parses faces activities that target another character', () => {
    const level = loadLevelFromText(facesCharacterTargetText);
    const niccollo = level.characters.find(character => character.id === 'niccollo');
    if (!niccollo) expect.fail('expected niccollo character to exist');

    expect(findCharacterPose(niccollo, 4_999).facingDirection).toBe('right');
    expect(findCharacterPose(niccollo, 5_000).facingDirection).toBe('left');
  });

  it('parses says activities directed to another character', () => {
    const level = loadLevelFromText(
      facesCharacterTargetText.replace('0:00:05 Niccollo faces Heinrich.', '0:00:05 Niccollo says "Hello!" to Heinrich.'),
      'speech-character-target.md');
    const niccollo = level.characters.find(character => character.id === 'niccollo');
    if (!niccollo) expect.fail('expected niccollo character to exist');

    expect(findCharacterPose(niccollo, 4_999).facingDirection).toBe('right');
    expect(findCharacterPose(niccollo, 5_000).facingDirection).toBe('left');
    expect(niccollo.itinerary.filter(event => event.startTime === 5_000).map(event => event.type)).toEqual([
      ItineraryEventType.FACE,
      ItineraryEventType.SPEECH
    ]);
  });

  it('parses interrupts activities directed to another character', () => {
    const level = loadLevelFromText(
      facesCharacterTargetText.replace('0:00:05 Niccollo faces Heinrich.', '0:00:05 Niccollo interrupts "Hello!" to Heinrich.'),
      'interrupts-character-target.md');
    const niccollo = level.characters.find(character => character.id === 'niccollo');
    if (!niccollo) expect.fail('expected niccollo character to exist');

    expect(findCharacterPose(niccollo, 4_999).facingDirection).toBe('right');
    expect(findCharacterPose(niccollo, 5_000).facingDirection).toBe('left');
    expect(niccollo.itinerary.filter(event => event.startTime === 5_000).map(event => event.type)).toEqual([
      ItineraryEventType.FACE,
      ItineraryEventType.SPEECH
    ]);
  });

  it('parses dies activities and defaults unspecified alive to true', () => {
    const level = loadLevelFromText(diesActivityText);
    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');

    expect(king.isAlive).toBe(true);
    expect(king.itinerary.some(event => event.type === ItineraryEventType.DIE)).toBe(true);
    expect(findCharacterPose(king, 4_999).isAlive).toBe(true);
    expect(findCharacterPose(king, 5_000).isAlive).toBe(false);
  });

  it('parses alive=false in character sections', () => {
    const level = loadLevelFromText(initiallyDeadCharacterActivityText.replace('0:00:05 King says "Boo."', ''), 'initially-dead-character-activity.md');
    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');

    expect(king.isAlive).toBe(false);
  });

  it('parses initial facing and orientation from character sections', () => {
    const level = loadLevelFromText(initialCharacterPoseText, 'initial-character-pose.md');
    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');

    expect(king.facingDirection).toBe('left');
    expect(king.bodyOrientation).toBe('sitting');
    expect(findCharacterPose(king, 0).facingDirection).toBe('left');
    expect(findCharacterPose(king, 0).bodyOrientation).toBe('sitting');
  });

  it('parses visible flags for character and item sections and defaults unspecified visible to true', () => {
    const level = loadLevelFromText(visibleFlagsText, 'visible-flags.md');

    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');
    expect(king.isVisible).toBe(false);

    const guard = level.characters.find(character => character.id === 'guard');
    if (!guard) expect.fail('expected guard character to exist');
    expect(guard.isVisible).toBe(true);

    const hiddenGem = level.itemsById.get('hidden gem');
    if (!hiddenGem) expect.fail('expected hidden gem item to exist');
    expect(hiddenGem.isVisible).toBe(false);

    const coin = level.itemsById.get('coin');
    if (!coin) expect.fail('expected coin item to exist');
    expect(coin.isVisible).toBe(true);
  });

  it('throws for invalid character visible values', () => {
    expect(() => loadLevelFromText(invalidCharacterVisibleText, 'invalid-character-visible.md'))
      .toThrow(/character king visible must be true or false/);
  });

  it('throws for invalid item visible values', () => {
    expect(() => loadLevelFromText(invalidItemVisibleText, 'invalid-item-visible.md'))
      .toThrow(/item coin visible must be true or false/);
  });

  it('parses show/hide activities for character and item targets', () => {
    const level = loadLevelFromText(showHideActivityText, 'show-hide-activity.md');
    const king = level.characters.find(character => character.id === 'king');

    if (!king) expect.fail('expected king character to exist');

    const visibilityEvents = king.itinerary.filter(event => event.type === ItineraryEventType.SHOW || event.type === ItineraryEventType.HIDE);
    expect(visibilityEvents).toEqual([
      { type:ItineraryEventType.HIDE, startTime:1_000, duration:0, targetId:'guard' },
      { type:ItineraryEventType.HIDE, startTime:2_000, duration:0, targetId:'hidden gem' },
      { type:ItineraryEventType.SHOW, startTime:3_000, duration:0, targetId:'guard' }
    ]);
  });

  it('rebuilds character and item visibility from show/hide events when scrubbing time', () => {
    const level = loadLevelFromText(showHideActivityText, 'show-hide-activity.md');
    const gameState = createGameState(level);

    rebuildDynamicStateForTime(gameState, 500);
    let guard = gameState.characters.find(character => character.id === 'guard') || null;
    let hiddenGem = gameState.itemsById.get('hidden gem') || null;
    expect(guard?.isVisible).toBe(true);
    expect(hiddenGem?.isVisible).toBe(true);

    rebuildDynamicStateForTime(gameState, 1_500);
    guard = gameState.characters.find(character => character.id === 'guard') || null;
    hiddenGem = gameState.itemsById.get('hidden gem') || null;
    expect(guard?.isVisible).toBe(false);
    expect(hiddenGem?.isVisible).toBe(true);

    rebuildDynamicStateForTime(gameState, 2_500);
    guard = gameState.characters.find(character => character.id === 'guard') || null;
    hiddenGem = gameState.itemsById.get('hidden gem') || null;
    expect(guard?.isVisible).toBe(false);
    expect(hiddenGem?.isVisible).toBe(false);

    rebuildDynamicStateForTime(gameState, 3_500);
    guard = gameState.characters.find(character => character.id === 'guard') || null;
    hiddenGem = gameState.itemsById.get('hidden gem') || null;
    expect(guard?.isVisible).toBe(true);
    expect(hiddenGem?.isVisible).toBe(false);

    rebuildDynamicStateForTime(gameState, 500);
    guard = gameState.characters.find(character => character.id === 'guard') || null;
    hiddenGem = gameState.itemsById.get('hidden gem') || null;
    expect(guard?.isVisible).toBe(true);
    expect(hiddenGem?.isVisible).toBe(true);
  });

  it('throws for show/hide activities with unknown targets', () => {
    expect(() => loadLevelFromText(unknownVisibilityTargetActivityText, 'unknown-visibility-target-activity.md'))
      .toThrow(/unknown visibility target 'Ghost' in authored activity 'hide Ghost'/);
  });

  it('throws when a dead character has a later itinerary activity after dying', () => {
    expect(() => loadLevelFromText(deadCharacterActivityText, 'dead-character-activity.md')).toThrow(/dead character king cannot perform itinerary activity/i);
  });

  it('throws when an initially dead character has any itinerary activity', () => {
    expect(() => loadLevelFromText(initiallyDeadCharacterActivityText, 'initially-dead-character-activity.md')).toThrow(/dead character king cannot perform itinerary activity/i);
  });

  it('parses standing, sitting, kneeling, and laying activities and resets body orientation to standing on walks', () => {
    const level = loadLevelFromText(bodyOrientationActivityText);
    const king = level.characters.find(character => character.id === 'king');
    if (!king) expect.fail('expected king character to exist');
    const walkEvent = king.itinerary.find(event => event.type === ItineraryEventType.WALK);
    if (!walkEvent) expect.fail('expected posture test fixture to generate a walk event');

    expect(king.itinerary.some(event => event.type === ItineraryEventType.BODY_ORIENTATION)).toBe(true);
    expect(findCharacterPose(king, 4_999).bodyOrientation).toBe('standing');
    expect(findCharacterPose(king, 5_000).bodyOrientation).toBe('sitting');
    expect(findCharacterPose(king, 6_000).bodyOrientation).toBe('kneeling');
    expect(findCharacterPose(king, 7_000).bodyOrientation).toBe('laying');
    expect(findCharacterPose(king, walkEvent.startTime - 1).bodyOrientation).toBe('laying');
    expect(findCharacterPose(king, walkEvent.startTime).bodyOrientation).toBe('standing');
    expect(findCharacterPose(king, 9_000).bodyOrientation).toBe('standing');
  });

  it('moves to a stacked room item floor square before applying a body orientation on that item', () => {
    const level = loadLevelFromText(bodyOrientationOnItemActivityText, 'body-orientation-on-item-activity.md');
    const hall = findRoom(level.rooms, 'Hall');
    const king = level.characters.find(character => character.id === 'king');
    const chair = hall.items.find(item => item.id === 'chair') || null;
    const cushion = hall.items.find(item => item.id === 'cushion') || null;
    if (!king) expect.fail('expected king character to exist');
    const walkEvents = king.itinerary.filter(event => event.type === ItineraryEventType.WALK) as Array<{ startTime:number, duration:number }>;
    const sitEvent = king.itinerary.find(event => event.type === ItineraryEventType.BODY_ORIENTATION) as { startTime:number, bodyOrientation:typeof king.bodyOrientation } | undefined;
    const lastWalkEvent = walkEvents[walkEvents.length - 1];
    const targetWaypoint = hall.waypoints.find(waypoint => waypoint.position.x === chair?.position.x
      && waypoint.position.y === chair?.position.y
      && waypoint.position.z === chair?.position.z) || null;

    expect(chair).not.toBeNull();
    expect(cushion).not.toBeNull();
    expect(cushion!.position.y).toBeLessThan(chair!.position.y);
    expect(walkEvents.length).toBeGreaterThan(0);
    expect(sitEvent).toBeDefined();
    expect(sitEvent?.bodyOrientation).toBe('sitting');
    expect(sitEvent?.startTime).toBe(lastWalkEvent.startTime + lastWalkEvent.duration);
    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king, sitEvent!.startTime).position).toEqual(targetWaypoint!.position);
    expect(findCharacterPose(king, sitEvent!.startTime).position.y).toBe(chair!.position.y);
  });

  it('parses outside room metadata and defaults omitted outside flags to false', () => {
    const level = loadLevelFromText(outsideRoomMetadataText, 'outside-room-metadata.md');

    const courtyard = level.rooms.find(room => room.id === 'courtyard');
    const hall = level.rooms.find(room => room.id === 'hall');

    expect(courtyard?.isOutside).toBe(true);
    expect(hall?.isOutside).toBe(false);
  });

  it('preserves an explicitly empty room title instead of falling back to the room subsection name', () => {
    const level = loadLevelFromText(emptyRoomTitleText, 'empty-room-title.md');

    expect(level.rooms[0]?.title).toBe('');
  });

  it('excludes rooms with empty titles from auto-generated conclusion room categories', () => {
    const level = loadLevelFromText(`${emptyRoomTitleText}\n\n# conclusions\n\n## Mystery\n\n* conclusion=[Hall] was empty.`, 'empty-room-title.md');
    const conclusion = level.conclusions.find(candidate => candidate.id === 'mystery') || null;
    if (!conclusion) expect.fail('expected Mystery conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Hall']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('loads a minified kingacide snapshot with conclusions and file-relative itinerary activity', () => {
    const level = loadLevelFromText(kingacideMinifiedSnapshotText, 'kingacide-minified-snapshot.md');

    expect(level.conclusions.map(conclusion => conclusion.title)).toEqual(['Identities', 'The Missing Book']);
    expect(level.conclusions[1].parts.length).toBeGreaterThan(0);
    expect(level.conclusions[1].parts[0].type).toBe('blank');
  });

  it('parses one conclusion per subsection from the conclusions section', () => {
    const level = loadLevelFromText(conclusionsTwoSubsectionsText);
    const authoredConclusions = level.conclusions.filter(conclusion => conclusion.title !== 'Identities');

    expect(authoredConclusions.map(conclusion => conclusion.title)).toEqual(['First', 'Second']);
    expect(authoredConclusions[0].parts.length).toBeGreaterThan(0);
    expect(authoredConclusions[1].parts.length).toBeGreaterThan(0);
  });

  it('collects available answers from all matching categories for each blank', () => {
    const level = loadLevelFromText(conclusionsCategoryMatchesText);
    const conclusion = level.conclusions.find(candidate => candidate.title === 'The Missing Book');
    if (!conclusion) expect.fail('expected The Missing Book conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;
    const secondBlank = conclusion.parts[2] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['King', 'Queen', 'Prince']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
    expect(secondBlank.availableAnswers).toEqual(['searched', 'looked', 'lied']);
    expect(secondBlank.correctAnswerIndexes).toEqual([0, 1]);
  });

  it('falls back to blank values when no category contains all correct answers', () => {
    const level = loadLevelFromText(conclusionsFallbackText);
    const conclusion = level.conclusions.find(candidate => candidate.title === 'Lone Blank');
    if (!conclusion) expect.fail('expected Lone Blank conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Throne Room']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
    expect(conclusion.isLocked).toBe(false);
    expect(conclusion.unlockConclusionIds).toEqual([]);
  });

  it('includes character inventory item titles in default conclusion item categories', () => {
    const level = loadLevelFromText(inventoryItemDefaultCategoryText);
    const conclusion = level.conclusions.find(candidate => candidate.id === 'missing item') || null;
    if (!conclusion) expect.fail('expected Missing Item conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Book', 'Crown']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('includes character hand-held item titles in default conclusion item categories', () => {
    const level = loadLevelFromText(handItemDefaultCategoryText);
    const conclusion = level.conclusions.find(candidate => candidate.id === 'missing item') || null;
    if (!conclusion) expect.fail('expected Missing Item conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Book', 'Crown']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('excludes noninteractive items from auto-generated cloze answer lists', () => {
    const level = loadLevelFromText(inventoryItemDefaultCategoryText
      .replace('* description=A crown.', '* description='));
    const conclusion = level.conclusions.find(candidate => candidate.id === 'missing item') || null;
    if (!conclusion) expect.fail('expected Missing Item conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Book']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('resolves conclusion revealRooms references by room id or title', () => {
    const level = loadLevelFromText(conclusionRevealRoomsText);
    const conclusion = level.conclusions.find(candidate => candidate.id === 'discovery') || null;

    expect(conclusion).not.toBeNull();
    expect(conclusion?.revealRoomIds).toEqual(['atrium', 'library']);
  });

  it('resolves unlockConclusions by conclusion id or title and locks targeted conclusions initially', () => {
    const level = loadLevelFromText(conclusionUnlockConclusionsText);
    const opener = level.conclusions.find(candidate => candidate.id === 'first') || null;
    const hiddenFollowup = level.conclusions.find(candidate => candidate.id === 'second') || null;

    expect(opener).not.toBeNull();
    expect(hiddenFollowup).not.toBeNull();
    expect(opener?.unlockConclusionIds).toEqual(['second']);
    expect(opener?.isLocked).toBe(false);
    expect(hiddenFollowup?.unlockConclusionIds).toEqual([]);
    expect(hiddenFollowup?.isLocked).toBe(true);
  });

  it('matches conclusion category phrases case-insensitively', () => {
    const level = loadLevelFromText(conclusionsCaseInsensitiveCategoriesText, 'case-insensitive-categories.md', { validateUnlockPhrases:true });
    const conclusion = level.conclusions.find(candidate => candidate.title === 'Mystery');
    if (!conclusion) expect.fail('expected Mystery conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Book']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('parses cloze statement image and separator parts', () => {
    const level = loadLevelFromText(conclusionsImageSeparatorText);
    const conclusion = level.conclusions[0];

    expect(conclusion.parts.map(part => part.type)).toEqual(['image', 'text', 'blank', 'separator', 'image', 'text', 'blank']);
    expect((conclusion.parts[0] as { imageUrl:string[] }).imageUrl).toEqual(getClozeImageCandidateUrls('kingFace.png'));
    expect((conclusion.parts[4] as { imageUrl:string[] }).imageUrl).toEqual(getClozeImageCandidateUrls('queenFace.png'));
  });

  it('defaults titles from ids and generates identities only for characters whose titles are not already known', () => {
    const level = loadLevelFromText(titleDefaultsAndGeneratedIdentityText);
    const hall = findRoom(level.rooms, 'Hall');
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const crown = hall.items.find(item => item.id === 'crown');
    const identities = level.conclusions.find(conclusion => conclusion.title === 'Identities') || null;
    const identityBlanks = (identities?.parts.filter(part => part.type === 'blank') || []) as ClozeBlank[];

    expect(hall.title).toBe('Grand Hall');
    expect(king?.title).toBe('His Majesty');
    expect(king?.isTitleKnown).toBe(true);
    expect(queen?.title).toBe('Queen');
    expect(queen?.isTitleKnown).toBe(false);
    expect(crown?.title).toBe('Crown');
    expect(identities?.title).toBe('Identities');
    expect(identities?.isLocked).toBe(false);
    expect(identityBlanks).toHaveLength(1);
    expect(identityBlanks[0].availableAnswers).toEqual(['Queen']);
    expect(identityBlanks[0].correctAnswerIndexes).toEqual([0]);
  });

  it('excludes noninteractive characters from auto-generated cloze answer lists', () => {
    const level = loadLevelFromText(noninteractiveCharacterDefaultCategoryText);
    const conclusion = level.conclusions.find(candidate => candidate.id === 'mystery') || null;
    if (!conclusion) expect.fail('expected Mystery conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['His Majesty']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('alphabetizes auto-generated character cloze answer lists', () => {
    const level = loadLevelFromText(alphabetizedCharacterDefaultCategoryText);
    const conclusion = level.conclusions.find(candidate => candidate.id === 'mystery') || null;
    if (!conclusion) expect.fail('expected Mystery conclusion to exist');
    const firstBlank = conclusion.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Alpha', 'Zulu']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('omits auto-generated identities when all character titles are already known', () => {
    const level = loadLevelFromText(identitiesAllTitlesKnownText);
    const identities = level.conclusions.find(conclusion => conclusion.id === 'identities') || null;

    expect(identities).toBeNull();
  });

  it('uses the generated identities conclusion as the default when an identities subsection only authors metadata', () => {
    const level = loadLevelFromText(identitiesAuthoredMetadataText);
    const identities = level.conclusions.find(conclusion => conclusion.id === 'identities') || null;
    const finalMystery = level.conclusions.find(conclusion => conclusion.id === 'final mystery') || null;
    const identityBlanks = (identities?.parts.filter(part => part.type === 'blank') || []) as ClozeBlank[];

    expect(identities).not.toBeNull();
    expect(identityBlanks).toHaveLength(1);
    expect(identities?.revealRoomIds).toEqual(['study']);
    expect(identities?.unlockConclusionIds).toEqual(['final mystery']);
    expect(identities?.isLocked).toBe(false);
    expect(finalMystery?.isLocked).toBe(true);
  });

  it('excludes characters with empty descriptions from generated identities', () => {
    const level = loadLevelFromText(identitiesExcludesNoninteractiveCharactersText);
    const identities = level.conclusions.find(conclusion => conclusion.id === 'identities') || null;
    const identityBlanks = (identities?.parts.filter(part => part.type === 'blank') || []) as ClozeBlank[];

    expect(identities).not.toBeNull();
    expect(identityBlanks).toHaveLength(2);
    expect(identityBlanks[0].availableAnswers).toEqual(['King', 'Queen']);
    expect(identityBlanks[1].availableAnswers).toEqual(['King', 'Queen']);
  });

  it('defaults titles by preserving authored casing from subsection names', () => {
    const level = loadLevelFromText(lowercaseTitleDefaultsText);
    const room = findRoom(level.rooms, 'MacDonald Chamber');
    const character = level.characters.find(candidate => candidate.id === 'lady macbeth') || null;
    const item = room.items.find(candidate => candidate.id === 'royal decree') || null;
    const conclusion = level.conclusions.find(candidate => candidate.id === 'the macdonald mystery') || null;

    expect(room.title).toBe('MacDonald Chamber');
    expect(character?.title).toBe('Lady MacBeth');
    expect(item?.title).toBe('royal decree');
    expect(conclusion?.title).toBe('The MacDonald Mystery');
  });

  it('preserves authored casing for inventory item titles from item subsection defaults', () => {
    const level = loadLevelFromText(inventoryItemTitleCasingText);
    const hero = level.characters.find(candidate => candidate.id === 'hero') || null;

    expect(hero).not.toBeNull();
    expect(hero?.items.map(item => item.title)).toEqual(['Royal Decree']);
  });

  it('defaults room titles from map legend text when there is no room subsection metadata', () => {
    const level = loadLevelFromText(mapLegendRoomTitleDefaultText);
    const room = findRoom(level.rooms, 'MacDonald Hall');

    expect(room.title).toBe('MacDonald Hall');
  });

  it('parses equivalent lockable locked exits from one-sided and two-sided authoring', () => {
    const oneSidedLevel = loadLevelFromText(lockableExitOneSidedText);
    const twoSidedLevel = loadLevelFromText(lockableExitTwoSidedText);
    const oneSidedExit = findRoom(oneSidedLevel.rooms, 'Bedroom').exits[0];
    const twoSidedExit = findRoom(twoSidedLevel.rooms, 'Bedroom').exits[0];

    expect(oneSidedExit.x).toBe(20);
    expect(oneSidedExit.y).toBe(20 - FLOOR_WAYPOINT_Y_OFFSET);
    expect(oneSidedExit.exitType).toBe(ExitType.lockableDoor);
    expect(oneSidedExit.exitStatus).toBe(ExitStatus.locked);
    expect(oneSidedExit.lockableFromRoom1With).toBe(LOCKABLE_WITHOUT_INV_CHECK);
    expect(oneSidedExit.lockableFromRoom2With).toBeNull();
    expect(twoSidedExit).toEqual(oneSidedExit);
  });

  it('parses lockable-with item requirements by resolving item titles to item ids', () => {
    const level = loadLevelFromText(lockableExitWithItemText);
    const exit = findRoom(level.rooms, 'Bedroom').exits[0];

    expect(exit.exitType).toBe(ExitType.lockableDoor);
    expect(exit.exitStatus).toBe(ExitStatus.locked);
    expect(exit.lockableFromRoom1With).toBe('red key');
    expect(exit.lockableFromRoom2With).toBeNull();
    expect(level.itemsById.get('red key')?.title).toBe('Red Key');
  });

  it('parses closed non-lockable door exits', () => {
    const level = loadLevelFromText(closedDoorExitText);
    const exit = findRoom(level.rooms, 'Bedroom').exits[0];

    expect(exit.exitType).toBe(ExitType.door);
    expect(exit.exitStatus).toBe(ExitStatus.closed);
    expect(exit.lockableFromRoom1With).toBeNull();
    expect(exit.lockableFromRoom2With).toBeNull();
  });

  it('loads winSynopsis from the general section and defaults it when omitted', () => {
    expect(loadLevelFromText(winSynopsisText).winSynopsis).toBe('The mystery is solved.');
    expect(loadLevelFromText(identitiesAllTitlesKnownText).winSynopsis).toBe('You completed the level.');
  });

  it('loads background image url from the general section and carries it into game state', () => {
    const level = loadLevelFromText(backgroundImageText, 'background-image.md');
    const gameState = createGameState(level);

    expect(level.backgroundImageUrl).toBe('/assets/backgrounds/castle-sky.png');
    expect(gameState.backgroundImageUrl).toBe('/assets/backgrounds/castle-sky.png');
    expect(gameState.groundFloorY).toBe(20);
  });

  it('throws when general background is authored as a path instead of a filename', () => {
    try {
      loadLevelFromText(invalidBackgroundImageText, 'invalid-background-image.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-background-image.md:3');
      expect((error as LoadLevelException).message).toContain('general background must be a filename, not a path or URL');
    }
  });

  it('throws when character faceImage is authored as a path instead of a filename', () => {
    try {
      loadLevelFromText(invalidFaceImageText, 'invalid-face-image.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-face-image.md:23');
      expect((error as LoadLevelException).message).toContain('character faceImage must be a filename, not a path or URL');
    }
  });

  it('loads item image url from item subsections into placed items and the item index', () => {
    const level = loadLevelFromText(itemImageText, 'item-image.md');
    const crown = level.rooms[0].items.find(item => item.id === 'crown') || null;

    expect(crown?.imageUrl).toBe(getItemImageAssetUrl('crown.png'));
    expect(level.itemsById.get('crown')?.imageUrl).toBe(getItemImageAssetUrl('crown.png'));
  });

  it('loads back wall textures from room metadata', () => {
    const level = loadLevelFromText(roomBackWallTextureText, 'room-back-wall-texture.md');
    const hall = level.rooms[0];

    expect(hall.backWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('greyBricks.png'),
      horizontalCount:4,
      verticalCount:4,
      modifiers:[]
    });
  });

  it('defaults omitted room texture counts to 4 by 4', () => {
    const level = loadLevelFromText(roomBackWallTextureDefaultCountsText, 'room-back-wall-texture-default-counts.md');
    const hall = level.rooms[0];

    expect(hall.backWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('greyBricks.png'),
      horizontalCount:4,
      verticalCount:4,
      modifiers:[]
    });
  });

  it('loads back wall texture image filters from room metadata', () => {
    const level = loadLevelFromText(roomBackWallTextureFilterText, 'room-back-wall-texture-filter.md');
    const hall = level.rooms[0];

    expect(hall.backWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('greyBricks.png'),
      horizontalCount:4,
      verticalCount:4,
      modifiers:[{ type:'imageFilter', imageFilterId:'aged stone' }]
    });
  });

  it('loads floor textures from room metadata', () => {
    const level = loadLevelFromText(roomFloorTextureText, 'room-floor-texture.md');
    const hall = level.rooms[0];

    expect(hall.floorTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('floorBricks.png'),
      horizontalCount:2,
      verticalCount:2,
      modifiers:[]
    });
  });

  it('loads right wall textures from room metadata', () => {
    const level = loadLevelFromText(roomRightWallTextureText, 'room-right-wall-texture.md');
    const hall = level.rooms[0];

    expect(hall.rightWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('wallBricks.png'),
      horizontalCount:2,
      verticalCount:2,
      modifiers:[]
    });
  });

  it('loads room textures from styles and lets room metadata override individual style textures', () => {
    const level = loadLevelFromText(roomStyleTextureText, 'room-style-texture.md');
    const nave = level.rooms.find(room => room.id === 'nave');
    const hall = level.rooms.find(room => room.id === 'hall');

    expect(nave?.backWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('greyBricks.png'),
      horizontalCount:4,
      verticalCount:4,
      modifiers:[{ type:'imageFilter', imageFilterId:'aged stone' }]
    });
    expect(nave?.floorTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('floorBricks.png'),
      horizontalCount:2,
      verticalCount:2,
      modifiers:[]
    });
    expect(nave?.rightWallTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('wallBricks.png'),
      horizontalCount:2,
      verticalCount:2,
      modifiers:[]
    });

    expect(hall?.backWallTexture).toEqual(nave?.backWallTexture);
    expect(hall?.rightWallTexture).toEqual(nave?.rightWallTexture);
    expect(hall?.floorTexture).toEqual({
      imageUrl:getRoomTextureAssetUrl('greyBricks.png'),
      horizontalCount:4,
      verticalCount:4,
      modifiers:[]
    });
  });

  it('loads item draw offsets from item subsections into placed items and the item index', () => {
    const level = loadLevelFromText(itemDrawOffsetText, 'item-draw-offset.md');
    const crown = level.rooms[0].items.find(item => item.id === 'crown') || null;

    expect(crown?.drawOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
    expect(level.itemsById.get('crown')?.drawOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
    expect(crown?.stackOffset).toEqual({ x:0, y:0, z:0 });
    expect(level.itemsById.get('crown')?.stackOffset).toEqual({ x:0, y:0, z:0 });
  });

  it('loads item stack offsets from item subsections into placed items and the item index', () => {
    const level = loadLevelFromText(itemStackOffsetText, 'item-stack-offset.md');
    const crown = level.rooms[0].items.find(item => item.id === 'crown') || null;

    expect(crown?.stackOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
    expect(level.itemsById.get('crown')?.stackOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
  });

  it('throws when item image is authored as a path instead of a filename', () => {
    try {
      loadLevelFromText(invalidItemImageText, 'invalid-item-image.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-item-image.md:24');
      expect((error as LoadLevelException).message).toContain('item image must be a filename, not a path or URL');
    }
  });

  it('throws when a conclusion cloze image is authored as a path instead of a filename', () => {
    try {
      loadLevelFromText(invalidClozeImageText, 'invalid-cloze-image.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-cloze-image.md:29');
      expect((error as LoadLevelException).message).toContain('conclusion cloze image must be a filename, not a path or URL');
    }
  });

  it('resolves groundFloorRoom by room title and carries the resulting groundFloorY into game state', () => {
    const level = loadLevelFromText(groundFloorRoomText, 'ground-floor-room.md');
    const gameState = createGameState(level);

    expect(level.groundFloorY).toBe(20);
    expect(gameState.groundFloorY).toBe(20);
  });

  it('throws when general groundFloorRoom does not match any room id or title', () => {
    try {
      loadLevelFromText(invalidGroundFloorRoomText, 'invalid-ground-floor-room.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-ground-floor-room.md:3');
      expect((error as LoadLevelException).message).toContain("general groundFloorRoom 'Missing Room' does not match any room in the level");
    }
  });

  it('throws when an outside room is below the authored groundFloorRoom', () => {
    try {
      loadLevelFromText(outsideRoomBelowGroundFloorText, 'outside-room-below-ground-floor.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('outside-room-below-ground-floor.md:3');
      expect((error as LoadLevelException).message).toContain("outside room 'Courtyard' is below general groundFloorRoom 'Upper Hallway'");
    }
  });

  it('throws on the exits line when a room specifies a non-adjacent exit room', () => {
    try {
      loadLevelFromText(invalidNonadjacentExitText, 'invalid-nonadjacent-exit.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('invalid-nonadjacent-exit.md');
      expect((error as LoadLevelException).errorLineNo).toBe(20);
      expect((error as LoadLevelException).message).toContain('invalid-nonadjacent-exit.md:20');
      expect((error as LoadLevelException).message).toContain('Kitchen, specified as an exit in Antechamber, is not adjacent.');
    }
  });

  it('wraps duplicate general entries with filename and line number', () => {
    try {
      loadLevelFromText(duplicateGeneralEntryText, 'duplicate-general-entry.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-general-entry.md:3');
      expect((error as LoadLevelException).message).toContain(`duplicate general entry 'activeCharacter'`);
    }
  });

  it('wraps duplicate top-level sections with filename and line number', () => {
    try {
      loadLevelFromText(duplicateGeneralSectionText, 'duplicate-general-section.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-general-section.md:5');
      expect((error as LoadLevelException).message).toContain(`duplicate section 'general'`);
    }
  });

  it('wraps unknown top-level sections with filename and line number', () => {
    try {
      loadLevelFromText(unknownTopLevelSectionText, 'unknown-top-level-section.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('unknown-top-level-section.md:5');
      expect((error as LoadLevelException).message).toContain(`unknown top-level section 'giovanni'`);
    }
  });

  it('fails level loading when no characters are placed in the level', () => {
    try {
      loadLevelFromText(noPlacedCharactersText, 'no-placed-characters.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('no-placed-characters.md:11');
      expect((error as LoadLevelException).message).toContain('level must include at least one placed character');
    }
  });

  it('fails level loading when general activeCharacter does not match a loaded character', () => {
    try {
      loadLevelFromText(invalidActiveCharacterText, 'invalid-active-character.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-active-character.md:2');
      expect((error as LoadLevelException).message).toContain(`general activeCharacter 'ghost' does not match any character in the level`);
    }
  });

  it('wraps conflicting exit modifiers with filename and line number', () => {
    try {
      loadLevelFromText(conflictingExitModifiersText, 'conflicting-exit-modifiers.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('conflicting-exit-modifiers.md:12');
      expect((error as LoadLevelException).message).toContain('conflicting exit modifiers');
    }
  });

  it('wraps unknown lockable-with item references with filename and line number', () => {
    try {
      loadLevelFromText(invalidLockableExitItemText, 'invalid-lockable-exit-item.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-lockable-exit-item.md:15');
      expect((error as LoadLevelException).message).toContain(`unknown item 'Missing Key' in 'Hallway (lockable with Missing Key)'`);
    }
  });

  it('wraps ceiling or floor exits with filename and line number', () => {
    try {
      loadLevelFromText(invalidCeilingFloorExitText, 'invalid-ceiling-floor-exit.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-ceiling-floor-exit.md:18');
      expect((error as LoadLevelException).message).toContain('ceiling or floor exits are not supported');
    }
  });

  it('throws on the exits line with guidance when multiple exits are comma-separated', () => {
    try {
      loadLevelFromText(commaSeparatedExitsWithModifiersText, 'comma-separated-exits-with-modifiers.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('comma-separated-exits-with-modifiers.md');
      expect((error as LoadLevelException).errorLineNo).toBe(16);
      expect((error as LoadLevelException).message).toContain('comma-separated-exits-with-modifiers.md:16');
      expect((error as LoadLevelException).message).toContain("multiple exits must be separated by '|'");
    }
  });

  it('throws when a room grid legend entry is not a known character or item', () => {
    try {
      loadLevelFromText(invalidRoomGridLegendEntryText, 'invalid-room-grid-legend-entry.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-room-grid-legend-entry.md:');
      expect((error as LoadLevelException).message).toContain("unknown room legend entry 'Window'");
    }
  });

  it('throws when a room fenced code grid does not match the expected room dimensions', () => {
    try {
      loadLevelFromText(invalidRoomGridDimensionsText, 'invalid-room-grid-dimensions.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-room-grid-dimensions.md:16');
      expect((error as LoadLevelException).message).toContain('room hall fenced code grid is 1 columns by 1 rows');
      expect((error as LoadLevelException).message).toContain('use 4 columns by 3 rows');
    }
  });

  it('assigns initial character and item depth from room grid rows', () => {
    const level = loadLevelFromText(roomGridDepthText);
    const hall = findRoom(level.rooms, 'Hall');
    const apple = hall.items.find(item => item.id === 'apple') || null;
    const coin = hall.items.find(item => item.id === 'coin') || null;
    const baron = level.characters.find(character => character.id === 'baron') || null;
    const duke = level.characters.find(character => character.id === 'duke') || null;
    const floorY = hall.rect.y + hall.rect.height - FLOOR_WAYPOINT_Y_OFFSET;

    expect(apple?.position.z).toBe(ROOM_BACK_ROW_CENTER_Z);
    expect(baron?.position.z).toBe(ROOM_MIDDLE_ROW_CENTER_Z);
    expect(baron?.position.y).toBe(floorY);
    expect(coin?.position.z).toBe(ROOM_FRONT_ROW_CENTER_Z);
    expect(duke?.position.z).toBe(ROOM_FRONT_ROW_CENTER_Z);
    expect(duke?.position.y).toBe(floorY);
  });

  it('loads multiple room items from one legend tile using stacked floor-based y offsets', () => {
    const level = loadLevelFromText(stackedRoomItemsText);
    const hall = findRoom(level.rooms, 'Hall');
    const table = hall.items.find(item => item.id === 'table') || null;
    const vase = hall.items.find(item => item.id === 'vase') || null;
    const centeredX = hall.rect.x + (2 + 0.5) * (hall.rect.width / 4);
    const floorY = hall.rect.y + hall.rect.height - FLOOR_WAYPOINT_Y_OFFSET;

    expect(hall.items.map(item => item.id)).toEqual(['table', 'vase']);
    expect(table?.position.x).toBe(centeredX);
    expect(vase?.position.x).toBe(centeredX);
    expect(table?.position.z).toBe(ROOM_BACK_ROW_CENTER_Z);
    expect(vase?.position.z).toBe(ROOM_BACK_ROW_CENTER_Z);
    expect(table?.position.y).toBe(floorY);
    expect(vase?.position.y).toBe(floorY - calcItemCuboidHeightGame(hall));
  });

  it('loads stacked room items with a trailing character while keeping the character on the floor waypoint', () => {
    const stackedCharacterText = stackedRoomItemsText
      .replace('Y.X.', '...X')
      .replace('* X=Table|Vase', '* X=Table|Vase|Hero')
      .replace('* Y=Hero\n', '');
    const level = loadLevelFromText(stackedCharacterText, 'stacked-room-items-character.md');
    const hall = findRoom(level.rooms, 'Hall');
    const table = hall.items.find(item => item.id === 'table') || null;
    const vase = hall.items.find(item => item.id === 'vase') || null;
    const hero = level.characters.find(character => character.id === 'hero') || null;
    const floorY = hall.rect.y + hall.rect.height - FLOOR_WAYPOINT_Y_OFFSET;

    expect(hall.items.map(item => item.id)).toEqual(['table', 'vase']);
    expect(table?.position.y).toBe(floorY);
    expect(vase?.position.y).toBe(floorY - calcItemCuboidHeightGame(hall));
    expect(hero?.position.x).toBe(table?.position.x);
    expect(hero?.position.y).toBe(floorY);
    expect(hero?.position.z).toBe(ROOM_BACK_ROW_CENTER_Z);
  });

  it('rejects stacked room entries that place a character before items', () => {
    const invalidStackOrderText = stackedRoomItemsText
      .replace('Y.X.', '...X')
      .replace('* X=Table|Vase', '* X=Hero|Table')
      .replace('* Y=Hero\n', '');

    try {
      loadLevelFromText(invalidStackOrderText, 'invalid-stacked-character-order.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-stacked-character-order.md:11');
      expect((error as LoadLevelException).message).toContain("must place any character last");
    }
  });

  it('rejects stacked room entries that place more than one character on a tile', () => {
    try {
      loadLevelFromText(invalidStackedMultipleCharactersText, 'invalid-stacked-multiple-characters.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
        expect((error as LoadLevelException).message).toContain('invalid-stacked-multiple-characters.md:11');
      expect((error as LoadLevelException).message).toContain("may include at most one character");
    }
  });

  it('uses item floor position scoring to choose the take waypoint before taking a stacked item', () => {
    const takeStackedItemText = `${stackedRoomItemsText}\n0:00:00 Hero takes Vase\n`;
    const level = loadLevelFromText(takeStackedItemText, 'take-stacked-item.md');
    const hall = findRoom(level.rooms, 'Hall');
    const hero = level.characters.find(character => character.id === 'hero') || null;
    const takeEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number } | undefined;
    const table = hall.items.find(item => item.id === 'table') || null;
    const targetWaypoint = hall.waypoints.find(waypoint => waypoint.position.x === table?.position.x
      && waypoint.position.y === table?.position.y
      && waypoint.position.z === ROOM_MIDDLE_ROW_CENTER_Z) || null;

    expect(hero).not.toBeNull();
    expect(table).not.toBeNull();
    expect(takeEvent).toBeDefined();
    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(hero!, takeEvent!.startTime).position).toEqual(targetWaypoint!.position);
  });

  it('loads drop activities and removes dropped items from final carried inventory', () => {
    const level = loadLevelFromText(dropItemText);
    const hero = level.characters.find(character => character.id === 'hero');
    const dropEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as { startTime:number, itemId:string, position:{ x:number, y:number, z:number } } | undefined;
    const dropStartPose = hero && dropEvent ? findCharacterPose(hero, dropEvent.startTime).position : null;

    expect(dropEvent?.itemId).toBe('book');
    expect(hero?.items.map(item => item.id)).not.toContain('book');
    expect(dropStartPose).not.toBeNull();
    expect(dropEvent!.position.x).toBeGreaterThan(dropStartPose!.x);
    expect(dropEvent?.position.y).toBe(dropStartPose?.y);
    expect(dropEvent?.position.z).toBe(ROOM_BACK_ROW_CENTER_Z);
    expect(dropEvent?.position).not.toEqual(dropStartPose);
  });

  it('loads drop drawOffset modifiers into both the drop event and the rebuilt dropped item state', () => {
    const dropOffsetText = dropItemText.replace('0:00:05 Hero drops Book', '0:00:05 Hero drops Book (1.5, -0.25, 0.1)');
    const level = loadLevelFromText(dropOffsetText, 'drop-item-draw-offset.md');
    const hero = level.characters.find(character => character.id === 'hero');
    const dropEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as {
      startTime:number,
      itemId:string,
      drawOffset:{ x:number, y:number, z:number }
    } | undefined;
    const gameState = createGameState(level);

    rebuildDynamicStateForTime(gameState, dropEvent!.startTime, dropEvent!.startTime - 1);

    const droppedBook = gameState.rooms[0].items.find(item => item.id === 'book') || null;

    expect(dropEvent?.itemId).toBe('book');
    expect(dropEvent?.drawOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
    expect(droppedBook?.drawOffset).toEqual({ x:1.5, y:-0.25, z:0.1 });
  });

  it('adds a short blocking pause after drop activities before after-previous events', () => {
    const dropPauseText = `${dropItemText}\n: Hero thinks "Done."`;
    const level = loadLevelFromText(dropPauseText, 'drop-pause.md');
    const hero = level.characters.find(character => character.id === 'hero');
    const dropEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as { startTime:number, duration:number } | undefined;
    const thoughtEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.THOUGHT) as { startTime:number } | undefined;

    expect(dropEvent?.duration).toBe(ITEM_EFFECT_DURATION);
    expect(thoughtEvent?.startTime).toBe(dropEvent!.startTime + dropEvent!.duration);
  });

  it('adds a short blocking pause after take activities before after-previous events', () => {
    const takePauseText = dropItemText
      .replace('....\n.H..\n....', '..B.\n.H..\n....')
      .replace('* H=Hero', '* H=Hero\n* B=Book')
      .replace('* items=Book\n', '')
      .replace('0:00:05 Hero drops Book', '0:00:05 Hero takes Book\n: Hero thinks "Done."');
    const level = loadLevelFromText(takePauseText, 'take-pause.md');
    const hero = level.characters.find(character => character.id === 'hero');
    const takeEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number, duration:number } | undefined;
    const thoughtEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.THOUGHT) as { startTime:number } | undefined;

    expect(takeEvent?.duration).toBe(ITEM_EFFECT_DURATION);
    expect(thoughtEvent?.startTime).toBe(takeEvent!.startTime + takeEvent!.duration);
  });

  it('throws when taking an item into an already occupied hand', () => {
    expect(() => loadLevelFromText(takeOccupiedLeftHandText, 'take-occupied-left-hand.md'))
      .toThrow("Hugo can't take Black Paint Jar in left hand because already holding Brass Key");
  });

  it('loads give activities without movement when the recipient is already nearby', () => {
    const level = loadLevelFromText(giveItemNearText);
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { itemId:string, recipientCharacterId:string } | undefined;

    expect(king?.itinerary.some(event => event.type === ItineraryEventType.WALK && event.startTime >= 5_000)).toBe(false);
    expect(giveEvent).toEqual({ type:ItineraryEventType.GIVE_ITEM, startTime:5_000, duration:0, itemId:'book', recipientCharacterId:'queen' });
    expect(king?.items.map(item => item.id)).not.toContain('book');
    expect(queen?.items.map(item => item.id)).toContain('book');
  });

  it('resolves a relative take after a zero-duration give using authored order', () => {
    const level = loadLevelFromText(giveItemRelativeTakeText, 'give-item-relative-take.md');
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number } | undefined;
    const takeEvent = queen?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) as { startTime:number, duration:number } | undefined;

    expect(giveEvent?.startTime).toBe(5_000);
    expect(takeEvent?.startTime).toBe(5_001);
    expect(takeEvent?.duration).toBe(ITEM_EFFECT_DURATION);
    expect(queen?.rightHandItem?.id).toBe('book');
    expect(queen?.items.map(item => item.id)).not.toContain('book');
  });

  it('loads emits activities for carried items that are not visible in hand', () => {
    const level = loadLevelFromText(itemEmitsActivityText);
    const hero = level.characters.find(character => character.id === 'hero');
    if (!hero) expect.fail('expected hero character to exist');
    const emitEvent = hero.itinerary.find(event => event.type === ItineraryEventType.EMIT);
    if (!emitEvent) expect.fail('expected emit event to exist');

    expect(emitEvent).toMatchObject({ itemId:'bell', emitText:'(clang)', startTime:5_000 });
  });

  it('loads lock and unlock activities with stable exit ids', () => {
    const level = loadLevelFromText(lockUnlockActivityText);
    const keeper = level.characters.find(character => character.id === 'keeper');
    const cell = findRoom(level.rooms, 'Cell');
    const exit = cell.exits.find(candidate => candidate.room1Id === 'second cell' || candidate.room2Id === 'second cell');
    const lockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.LOCK) as { startTime:number, roomExitId:string } | undefined;
    const unlockEvent = keeper?.itinerary.find(event => event.type === ItineraryEventType.UNLOCK) as { startTime:number, roomExitId:string } | undefined;

    expect(exit).toBeDefined();
    expect(lockEvent?.roomExitId).toBe(exit?.id);
    expect(unlockEvent?.startTime).toBe(20_000);
    expect(unlockEvent?.roomExitId).toBe(exit?.id);
  });

  it('allows lock activities when the required item is carried in hand', () => {
    const level = loadLevelFromText(lockRequiredItemInHandText, 'lock-required-item-in-hand.md');
    const keeper = level.characters.find(character => character.id === 'keeper');

    expect(keeper?.rightHandItem?.id).toBe('red key');
    expect(keeper?.itinerary.some(event => event.type === ItineraryEventType.LOCK)).toBe(true);
  });

  it('parses itinerary lines with extra punctuation and whitespace outside quotes', () => {
    const level = loadLevelFromText(itineraryExtraPunctuationText);
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const library = findRoom(level.rooms, 'Library');
    const floorY = library.rect.y + library.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
    const queenPose = findCharacterPose(queen!, 6_000).position;
    const targetWaypoint = library.waypoints.reduce((rightmostUnclaimedFloorWaypoint, waypoint) => {
      if (waypoint.position.y !== floorY
        || waypoint.position.z !== WAYPOINT_MIDDLE_ROW_Z) return rightmostUnclaimedFloorWaypoint;
      if (waypoint.position.x === queenPose.x) return rightmostUnclaimedFloorWaypoint;
      if (!rightmostUnclaimedFloorWaypoint) return waypoint;
      return waypoint.position.x > rightmostUnclaimedFloorWaypoint.position.x ? waypoint : rightmostUnclaimedFloorWaypoint;
    }, null as typeof library.waypoints[number] | null);
    const speechEvent = king?.itinerary.find(event => event.type === ItineraryEventType.SPEECH && event.startTime === 7_000) as { speech:string } | undefined;

    expect(king?.itinerary.some(event => event.type === ItineraryEventType.WALK)).toBe(true);
    expect(queen?.items.map(item => item.id)).toContain('book');
    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 6_000).position).toEqual(targetWaypoint!.position);
    expect(speechEvent?.speech).toBe('Hello, dear.');
  });

  it('sets level duration from the longest character itinerary', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    expect(level.duration).toEqual(44_000);
  });

  it('keeps both start and end time labels for short levels', () => {
    const level = loadLevelFromText(shortDurationLabelsText);

    expect(level.labels).toHaveLength(2);
    expect(level.labels.map(label => label.minutes)).toEqual([0, level.duration / 60_000]);
  });

  it('allows later simultaneous arrival timestamps in the doors itinerary', () => {
    const laterArrivalText = doorsArrivalTimestampText
      .replace('0:00:12 Amos @ Torture Chamber', '0:00:24 Amos @ Torture Chamber')
      .replace('0:00:12 Simon @ Hallway', '0:00:24 Simon @ Hallway');

    expect(() => loadLevelFromText(laterArrivalText, 'doors-arrival-timestamp.md')).not.toThrow();
  });

  it('throws when says would overlap another audible character speech', () => {
    try {
      loadLevelFromText(audibleSpeechOverlapText, 'audible-speech-overlap.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('audible-speech-overlap.md');
      expect((error as LoadLevelException).errorLineNo).toBe(54);
      expect((error as LoadLevelException).message).toContain('audible speech overlap');
      expect((error as LoadLevelException).message).toContain('Bob is already speaking');
      expect((error as LoadLevelException).message).toContain('Use \'interrupts\' instead of \'says\'');
    }
  });

  it('allows interrupts to overlap another audible character speech', () => {
    expect(() => loadLevelFromText(audibleSpeechInterruptsText, 'audible-speech-interrupts.md')).not.toThrow();
  });

  it('accepts comma punctuation after says, interrupts, and thinks', () => {
    const punctuatedInterruptsText = audibleSpeechInterruptsText
      .replace('0:00:01 June interrupts "Hi, Bob."', '0:00:01 June interrupts, "Hi, Bob."');
    const punctuatedThoughtText = audibleSpeechOverlapText
      .replace('0:00:01 June says "Hi, Bob."', '0:00:01 June thinks, "Hi, Bob."');

    expect(() => loadLevelFromText(itineraryExtraPunctuationText, 'itinerary-extra-punctuation.md')).not.toThrow();
    expect(() => loadLevelFromText(punctuatedInterruptsText, 'audible-speech-interrupts.md')).not.toThrow();
    expect(() => loadLevelFromText(punctuatedThoughtText, 'audible-thought-overlap.md')).not.toThrow();
  });

  it('allows thinks to overlap another audible character speech', () => {
    const audibleThoughtOverlapText = audibleSpeechOverlapText
      .replace('0:00:01 June says "Hi, Bob."', '0:00:01 June thinks "Hi, Bob."');

    expect(() => loadLevelFromText(audibleThoughtOverlapText, 'audible-thought-overlap.md')).not.toThrow();
  });

  it('throws when a lock activity targets a room that is not directly connected', () => {
    try {
      loadLevelFromText(lockNonadjacentRoomText, 'lock-nonadjacent-room.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('lock-nonadjacent-room.md');
      expect((error as LoadLevelException).errorLineNo).toBe(59);
      expect((error as LoadLevelException).message).toContain('lock-nonadjacent-room.md:59');
      expect((error as LoadLevelException).message).toContain('room Second Cell is not connected to Cell for itinerary activity');
    }
  });

  it('throws when a lock activity targets a non-lockable exit', () => {
    try {
      loadLevelFromText(lockNonlockableExitText, 'lock-nonlockable-exit.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('lock-nonlockable-exit.md');
      expect((error as LoadLevelException).errorLineNo).toBe(48);
      expect((error as LoadLevelException).message).toContain('lock-nonlockable-exit.md:48');
      expect((error as LoadLevelException).message).toContain('exit to Second Cell is not lockable for itinerary activity');
    }
  });

  it('throws when an unlock activity is authored from the wrong side of a lockable exit', () => {
    try {
      loadLevelFromText(unlockWrongSideText, 'unlock-wrong-side.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('unlock-wrong-side.md');
      expect((error as LoadLevelException).errorLineNo).toBe(48);
      expect((error as LoadLevelException).message).toContain('unlock-wrong-side.md:48');
      expect((error as LoadLevelException).message).toContain('exit to Second Cell cannot be locked or unlocked from Cell');
    }
  });

  it('throws when a lock activity requires an item the character is not carrying', () => {
    try {
      loadLevelFromText(lockRequiredItemMissingText, 'lock-required-item-missing.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('lock-required-item-missing.md:52');
      expect((error as LoadLevelException).message).toContain('exit to Second Cell requires item red key to be carried for itinerary activity');
    }
  });

  it('throws when an unlock activity requires an item the character is not carrying', () => {
    try {
      loadLevelFromText(unlockRequiredItemMissingText, 'unlock-required-item-missing.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('unlock-required-item-missing.md:52');
      expect((error as LoadLevelException).message).toContain('exit to Second Cell requires item red key to be carried for itinerary activity');
    }
  });

  it('throws when the same character would speak over their own earlier speech', () => {
    try {
      loadLevelFromText(overlappingSameCharacterSpeechText, 'overlapping-same-character-speech.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('overlapping-same-character-speech.md');
      expect((error as LoadLevelException).errorLineNo).toBe(35);
      expect((error as LoadLevelException).message).toContain('same character speech overlap');
      expect((error as LoadLevelException).message).toContain('0:00:01');
      expect((error as LoadLevelException).message).toContain('absolute timestamp');
      expect((error as LoadLevelException).message).toContain(`use ':' if it should wait for the previous activity`);
    }
  });

  it('throws when the same character would think over their own earlier thought', () => {
    const overlappingSameCharacterThoughtText = overlappingSameCharacterSpeechText
      .replace('0:00:00 Bob says, "Why hello there, June! I have more than one second of things to say to you right now."',
        '0:00:00 Bob thinks "Why hello there, June! I have more than one second of things to think to myself right now."')
      .replace('0:00:01 Bob says, "Hi again."', '0:00:01 Bob thinks "Hi again."');

    try {
      loadLevelFromText(overlappingSameCharacterThoughtText, 'overlapping-same-character-thought.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('overlapping-same-character-thought.md');
      expect((error as LoadLevelException).errorLineNo).toBe(35);
      expect((error as LoadLevelException).message).toContain('same character thought overlap');
      expect((error as LoadLevelException).message).toContain('0:00:01');
      expect((error as LoadLevelException).message).toContain('absolute timestamp');
      expect((error as LoadLevelException).message).toContain(`use ':' if it should wait for the previous activity`);
    }
  });

  it('findCharacterPose returns active thoughts separately from speech', () => {
    const thinkingCharacterText = shortDurationLabelsText
      .replace('0:00:10 Hero says, "Done."', '0:00:10 Hero thinks, "Done."');
    const level = loadLevelFromText(thinkingCharacterText, 'thinking-character.md');
    const hero = level.characters.find(character => character.id === 'hero');

    expect(hero).toBeTruthy();
    expect(hero?.itinerary[0]?.type).toBe(ItineraryEventType.THOUGHT);
    expect(findCharacterPose(hero!, 10_000).speech).toBeNull();
    expect(findCharacterPose(hero!, 10_000).thought).toBe('Done.');
  });


  it('wraps itinerary line errors with filename and line number', () => {
    try {
      loadLevelFromText(invalidItineraryActivityText, 'invalid-itinerary-activity.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('invalid-itinerary-activity.md');
      expect((error as LoadLevelException).errorLineNo).toBe(34);
      expect((error as LoadLevelException).message).toContain('invalid-itinerary-activity.md:34');
      expect((error as LoadLevelException).message).toMatch(/parse itinerary activity line/i);
    }
  });

  it('wraps invalid itinerary timestamps with filename and line number', () => {
    try {
      loadLevelFromText(invalidItineraryTimestampText, 'invalid-itinerary-timestamp.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-itinerary-timestamp.md:34');
      expect((error as LoadLevelException).message).toContain('invalid timestamp: 0:00:60');
    }
  });

  it('wraps invalid @ room percent references with filename and line number', () => {
    const invalidPercentText = atRoomMarkerText.replace('@ Library.0%', '@ Library.101%');

    try {
      loadLevelFromText(invalidPercentText, 'at-room-marker.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('at-room-marker.md:48');
      expect((error as LoadLevelException).message).toContain("invalid room percent target '101%'");
    }
  });

  it('wraps empty @ targets with filename and line number', () => {
    const missingTargetText = atRoomMarkerText.replace('@ Library.0%', '@');

    try {
      loadLevelFromText(missingTargetText, 'at-room-marker.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('at-room-marker.md:48');
      expect((error as LoadLevelException).message).toContain("missing room id in authored activity '@'");
    }
  });

  it('wraps unknown @ room destinations with filename and line number', () => {
    try {
      loadLevelFromText(invalidAtRoomDestinationText, 'invalid-at-room-destination.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-at-room-destination.md:41');
      expect((error as LoadLevelException).message).toContain(`unknown room id 'West Hall'`);
    }
  });

  it('suggests the earliest possible arrival time for impossible absolute @ room timestamps', () => {
    try {
      loadLevelFromText(impossibleAtRoomArrivalText, 'impossible-at-room-arrival.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('impossible-at-room-arrival.md:45');
      expect((error as LoadLevelException).message).toContain('Unable to arrive to Tool Store by 0:00:00. The earliest possible arrival is ');
    }
  });

  it('throws when a cloze answer phrase is missing from all conclusion categories', () => {
    try {
      loadLevelFromText(missingConclusionPhraseText, 'missing-conclusion-phrase.md', { validateUnlockPhrases:true });
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('missing-conclusion-phrase.md');
      expect((error as LoadLevelException).message).toContain('missing conclusion answer phrases from conclusion categories: Ghost');
    }
  });

  it('allows authored conclusion category overrides to replace default room names', () => {
    expect(() => loadLevelFromText(overrideRoomsText, 'override-rooms.md', { validateUnlockPhrases:true })).not.toThrow();
  });

  it('allows overriding generated category groups and reusing values across different groups', () => {
    expect(() => loadLevelFromText(overrideGeneratedCategoryGroupCaseText, 'override-generated-category-group-case.md', { validateUnlockPhrases:true })).not.toThrow();
  });

  it('throws when a conclusion defines duplicate unlockConclusions entries', () => {
    try {
      loadLevelFromText(duplicateUnlockText, 'duplicate-unlock.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-unlock.md:34');
      expect((error as LoadLevelException).message).toContain("duplicate conclusion mystery entry 'unlockConclusions'");
    }
  });

  it('wraps duplicate normalized character subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateCharacterSubsectionsCaseText, 'duplicate-character-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-character-subsections-case.md:30');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'HERO' conflicts with 'Hero'`);
    }
  });

  it('wraps duplicate normalized multi-word character subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateCharacterSubsectionsSpacesText, 'duplicate-character-subsections-spaces.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-character-subsections-spaces.md:30');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'BOB ODARE' conflicts with 'Bob Odare'`);
    }
  });

  it('loads room legend character references whose normalized ids contain spaces', () => {
    const level = loadLevelFromText(characterIdWithSpacesRoomLegendText);
    const character = level.characters.find(candidate => candidate.id === 'bob odare') || null;

    expect(character).not.toBeNull();
    expect(character?.title).toBe('Bob Odare');
    expect(level.activeCharacterId).toBe('bob odare');
    expect(findRoom(level.rooms, 'Hall').items).toHaveLength(0);
  });

  it('wraps duplicate character property entries with filename and line number', () => {
    try {
      loadLevelFromText(duplicateCharacterPropertyText, 'duplicate-character-property.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-character-property.md:29');
      expect((error as LoadLevelException).message).toContain(`duplicate character hero entry 'description'`);
    }
  });

  it('wraps duplicate normalized item subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateItemSubsectionsCaseText, 'duplicate-item-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-item-subsections-case.md:28');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'BOOK' conflicts with 'Book'`);
    }
  });

  it('wraps duplicate room ids from map legend reuse with filename and line number', () => {
    try {
      loadLevelFromText(duplicateRoomIdMapLegendText, 'duplicate-room-id-map-legend.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-room-id-map-legend.md:7');
      expect((error as LoadLevelException).message).toContain(`duplicate room id 'HALL' conflicts with 'Hall' in map legend`);
    }
  });

  it('wraps duplicate map legend entries with filename and line number', () => {
    try {
      loadLevelFromText(duplicateMapLegendEntryText, 'duplicate-map-legend-entry.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-map-legend-entry.md:13');
      expect((error as LoadLevelException).message).toContain(`duplicate map legend entry 'A'`);
    }
  });

  it('wraps duplicate room legend entries with filename and line number', () => {
    try {
      loadLevelFromText(duplicateRoomLegendEntryText, 'duplicate-room-legend-entry.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-room-legend-entry.md:23');
      expect((error as LoadLevelException).message).toContain(`duplicate room hall entry 'H'`);
    }
  });

  it('wraps duplicate character ids from room placement with filename and line number', () => {
    try {
      loadLevelFromText(duplicateCharacterPlacementText, 'duplicate-character-placement.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-character-placement.md:15');
      expect((error as LoadLevelException).message).toContain(`duplicate character id 'hero'`);
    }
  });

  it('wraps character inventory items missing from the items section with filename and line number', () => {
    try {
      loadLevelFromText(invalidCharacterInventoryItemText, 'invalid-character-inventory-item.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-character-inventory-item.md:33');
      expect((error as LoadLevelException).message).toContain(`character hero inventory item 'Missing Book' does not match any item in the items section`);
    }
  });

  it('wraps invalid isTitleKnown values with filename and line number', () => {
    try {
      loadLevelFromText(invalidIsTitleKnownText, 'invalid-is-title-known.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-is-title-known.md:27');
      expect((error as LoadLevelException).message).toContain('character hero isTitleKnown must be true or false');
    }
  });

  it('wraps duplicate item ids across placed and inventory items with filename and line number', () => {
    try {
      loadLevelFromText(duplicateItemIdInventoryText, 'duplicate-item-id-inventory.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-item-id-inventory.md:34');
      expect((error as LoadLevelException).message).toContain(`duplicate item id 'book' in character hero inventory`);
    }
  });

  it('wraps duplicate normalized conclusion category group names with filename and line number', () => {
    try {
      loadLevelFromText(duplicateConclusionCategoryGroupNamesText, 'duplicate-conclusion-category-group-names.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-conclusion-category-group-names.md:36');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'rooms' conflicts with 'Rooms'`);
    }
  });

  it('wraps duplicate normalized conclusion subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateConclusionSubsectionsCaseText, 'duplicate-conclusion-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-conclusion-subsections-case.md:39');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'mystery' conflicts with 'Mystery'`);
    }
  });

  it('wraps duplicate conclusion property entries with filename and line number', () => {
    try {
      loadLevelFromText(duplicateConclusionPropertyText, 'duplicate-conclusion-property.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-conclusion-property.md:38');
      expect((error as LoadLevelException).message).toContain(`duplicate conclusion mystery entry 'conclusion'`);
    }
  });

  it('loads legacy room grids that still contain # tiles', () => {
    expect(() => loadLevelFromText(wanderingTrappedText, 'wandering-trapped.md')).not.toThrow();
  });

  it('wraps unknown map legend tiles with filename and line number', () => {
    try {
      loadLevelFromText(invalidMapLegendTileText, 'invalid-map-legend-tile.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-map-legend-tile.md:7');
      expect((error as LoadLevelException).message).toContain(`unknown map legend tile 'B'`);
    }
  });

  it('wraps a missing map section with filename and line number', () => {
    try {
      loadLevelFromText(missingMapSectionText, 'missing-map-section.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('missing-map-section.md:1');
      expect((error as LoadLevelException).message).toContain('missing required map section');
    }
  });

  it('wraps a missing map grid with filename and line number', () => {
    try {
      loadLevelFromText(mapMissingGridText, 'map-missing-grid.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('map-missing-grid.md:7');
      expect((error as LoadLevelException).message).toContain('map section must include a fenced grid');
    }
  });

  it('wraps unused map legend entries with filename and line number', () => {
    try {
      loadLevelFromText(mapUnusedLegendEntryText, 'map-unused-legend-entry.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('map-unused-legend-entry.md:7');
      expect((error as LoadLevelException).message).toContain(`map legend tile 'B' is not used in the map grid`);
    }
  });

  it('wraps non-rectangular map rooms with filename and line number', () => {
    try {
      loadLevelFromText(mapNonRectangularRoomText, 'map-non-rectangular-room.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('map-non-rectangular-room.md:7');
      expect((error as LoadLevelException).message).toContain(`map room 'Hall' must be rectangular`);
    }
  });

  it('wraps map legend rooms missing from the rooms section with filename and line number', () => {
    try {
      loadLevelFromText(mapRoomMissingFromRoomsSectionText, 'map-room-missing-from-rooms-section.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('map-room-missing-from-rooms-section.md:15');
      expect((error as LoadLevelException).message).toContain(`map legend room 'Hall' does not match any room in the rooms section`);
    }
  });

  it('wraps unknown room legend tiles with filename and line number', () => {
    try {
      loadLevelFromText(invalidRoomLegendTileText, 'invalid-room-legend-tile.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-room-legend-tile.md:15');
      expect((error as LoadLevelException).message).toContain(`unknown room legend tile 'X'`);
    }
  });

  it('wraps duplicate normalized room subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateRoomSubsectionsCaseText, 'duplicate-room-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-room-subsections-case.md:24');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'HALL' conflicts with 'Hall'`);
    }
  });

  describe('timeline start/end configuration', () => {
    it('parses startTime separately from the initial playhead time', () => {
      const level = loadLevelFromText(timelineStartTimeFieldText);

      expect(level.startTime).toBe(10 * 60 * 60 * 1000);
      expect(level.initialTime).toBe(10 * 60 * 60 * 1000);
    });

    it('accepts both time and startTime and keeps them distinct', () => {
      const level = loadLevelFromText(timelineBothTimeAndStartTimeText, 'timeline-both.md');
      const gameState = createGameState(level);

      expect(level.startTime).toBe(10 * 60 * 60 * 1000);
      expect(level.initialTime).toBe(10 * 60 * 60 * 1000 + 30 * 60 * 1000);
      expect(gameState.time).toBe(level.initialTime);
      expect(gameState.startTime).toBe(level.startTime);
    });

    it('derives omitted startTime, endTime, and default time from itinerary timing', () => {
      const level = loadLevelFromText(timelineDerivedBoundsText);

      expect(level.startTime).toBe(10 * 60 * 60 * 1000);
      expect(level.initialTime).toBe(level.startTime);
      expect(level.endTime).toBe(12 * 60 * 60 * 1000);
      expect(level.duration).toBe(2 * 60 * 60 * 1000);
    });

    it('derives bounds from relative-only itinerary timing when there are no absolute timestamps', () => {
      const level = loadLevelFromText(timelineRelativeOnlyText);

      expect(level.startTime).toBe(0);
      expect(level.initialTime).toBe(0);
      expect(level.endTime).toBeGreaterThan(level.startTime);
      expect(level.duration).toBe(level.endTime - level.startTime);
    });

    it('starts the first relative itinerary activity at the level start time when time is authored without startTime', () => {
      const level = loadLevelFromText(birthOfConstantineRegressionText, 'birth-of-constantine-regression.md');
      const agatha = level.characters.find(character => character.id === 'sticky agatha');
      const firstSpeech = agatha?.itinerary.find(event => event.type === ItineraryEventType.SPEECH) || null;
      const takeEvent = agatha?.itinerary.find(event => event.type === ItineraryEventType.TAKE_ITEM) || null;

      expect(level.startTime).toBe(9 * 60 * 60 * 1000);
      expect(level.initialTime).toBe(level.startTime);
      expect(firstSpeech?.startTime).toBe(level.startTime);
      expect(takeEvent?.startTime).toBeGreaterThanOrEqual(level.startTime);
    });

    it('throws when general time falls outside the resolved authored span', () => {
      try {
        loadLevelFromText(timelineInitialTimeOutsideBoundsText, 'timeline-initial-time-outside-bounds.md');
        expect.fail('expected level loading to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LoadLevelException);
        expect((error as LoadLevelException).message).toContain('timeline-initial-time-outside-bounds.md:3');
        expect((error as LoadLevelException).message).toContain('general time 8:30:00 must fall within the authored span 10:00:00 to 18:00:00');
      }
    });

    it('throws when explicit startTime excludes resolved itinerary timing', () => {
      try {
        loadLevelFromText(timelineStartAfterItineraryText, 'timeline-start-after-itinerary.md');
        expect.fail('expected level loading to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LoadLevelException);
        expect((error as LoadLevelException).message).toContain('timeline-start-after-itinerary.md:3');
        expect((error as LoadLevelException).message).toContain('general startTime 11:00:00 excludes itinerary content at 10:00:00');
        expect((error as LoadLevelException).message).toContain('Try startTime=10:00:00');
      }
    });

    it('uses explicit endTime to compute duration for a same-day timeline', () => {
      const level = loadLevelFromText(timelineExplicitEndSameDayText);

      expect(level.startTime).toBe(10 * 60 * 60 * 1000);
      expect(level.endTime).toBe(18 * 60 * 60 * 1000);
      expect(level.duration).toBe(8 * 60 * 60 * 1000);
    });

    it('treats endTime <= startTime as cross-midnight and adds 24 hours to the resolved end', () => {
      const level = loadLevelFromText(timelineCrossMidnightText);
      const startTime = 19 * 60 * 60 * 1000 + 30 * 60 * 1000;
      const rawEndTime = 7 * 60 * 60 * 1000;

      expect(level.startTime).toBe(startTime);
      expect(level.endTime).toBe(rawEndTime + MSECS_IN_DAY);
      expect(level.duration).toBe(level.endTime - level.startTime);
    });

    it('resolves cross-midnight itinerary timestamps less than startTime to the next day', () => {
      const level = loadLevelFromText(timelineCrossMidnightText);
      const hero = level.characters.find(character => character.id === 'hero');

      const speechEvents = hero?.itinerary.filter(event => event.type === ItineraryEventType.SPEECH) || [];
      const speechStartTimes = speechEvents.map(event => event.startTime);

      expect(speechStartTimes).toContain(22 * 60 * 60 * 1000);
      expect(speechStartTimes).toContain(MSECS_IN_DAY + 15 * 60 * 1000);
      expect(speechStartTimes).toContain(MSECS_IN_DAY + 6 * 60 * 60 * 1000 + 45 * 60 * 1000);
    });

    it('throws when an absolute itinerary timestamp falls outside the explicit timeline window', () => {
      try {
        loadLevelFromText(timelineEventOutsideWindowText, 'timeline-event-outside-window.md');
        expect.fail('expected level loading to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LoadLevelException);
        expect((error as LoadLevelException).message).toContain('outside the timeline window');
      }
    });

    it('generates time labels in absolute-since-midnight space spanning startTime to endTime', () => {
      const level = loadLevelFromText(timelineExplicitEndSameDayText);
      const labelMinutes = level.labels.map(label => label.minutes);
      const labelTexts = level.labels.map(label => label.label);

      expect(labelMinutes[0]).toBe(10 * 60);
      expect(labelMinutes[labelMinutes.length - 1]).toBe(18 * 60);
      expect(labelTexts[0]).toBe('10am');
      expect(labelTexts[labelTexts.length - 1]).toBe('6pm');
    });

    it('wraps cross-midnight time labels through the wall-clock 24-hour boundary', () => {
      const level = loadLevelFromText(timelineCrossMidnightText);
      const labelMinutes = level.labels.map(label => label.minutes);
      const labelTexts = level.labels.map(label => label.label);

      expect(labelMinutes[0]).toBe(19 * 60 + 30);
      expect(labelMinutes[labelMinutes.length - 1]).toBe(31 * 60);
      expect(labelTexts[0]).toBe('7:30pm');
      expect(labelTexts[labelTexts.length - 1]).toBe('7am');
      expect(labelTexts.some(text => text.endsWith('am') && !text.startsWith('7'))).toBe(true);
    });
  });

  describe('stairwell regression loading', () => {
    it('loads escape without stairwell route planning errors', () => {
      expect(() => loadLevelFromText(escapeStairwellRegressionText, 'escape-stairwell-regression.md')).not.toThrow();
    });
  });

});

describe('levelUtil url loading', () => {
  function _stubLevelUrlFetch(levelTextsByPath:Record<string, string>) {
    const fetchMock = vi.fn(async (url:string) => {
      const entry = Object.entries(levelTextsByPath).find(([path]) => url.endsWith(path)) || null;
      if (!entry) throw new Error(`unexpected url ${url}`);
      return { ok:true, text:async () => entry[1] };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads imported level content when called with a level url', async () => {
    const fetchMock = _stubLevelUrlFetch({
      '/levels/load-level-from-url-with-imports.md':loadLevelFromUrlWithImportsText,
      '/levels/load-level-from-url-with-imports-characters.md':loadLevelFromUrlWithImportsCharactersText
    });

    const level = await loadLevelFromUrl('/levels/load-level-from-url-with-imports.md');

    expect(level.characters.find(character => character.id === 'hero')?.faceImageUrl).toBe('/assets/faces/heroFace.png');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('combines imported and local character subsection fields when loading from a level url', async () => {
    _stubLevelUrlFetch({
      '/levels/load-level-from-url-with-imports-salomone.md':loadLevelFromUrlWithImportsSalomoneText,
      '/levels/load-level-from-url-with-imports-salomone-characters.md':loadLevelFromUrlWithImportsSalomoneCharactersText
    });

    const level = await loadLevelFromUrl('/levels/load-level-from-url-with-imports-salomone.md');
    const salomone = level.characters.find(character => character.id === 'salomone');

    expect(salomone).toMatchObject({
      title:'Salomone ben David di Palermo',
      description:'Thoughtful eyes, slim build. This middle-aged man seems well-suited to mental work.',
      faceImageUrl:'/assets/faces/salamone.png'
    });
    expect(salomone?.items.map(item => item.id)).toEqual(['abacus']);
  });

  it('reports root-file validation errors using the original root source line', async () => {
    const sourceText = loadLevelFromUrlWithImportsText.replace('* title=Imported URL Level', '* activeCharacter=Ghost');
    _stubLevelUrlFetch({
      '/levels/source.md':sourceText,
      '/levels/load-level-from-url-with-imports-characters.md':loadLevelFromUrlWithImportsCharactersText
    });

    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toMatchObject({
      levelFilename:'source.md',
      errorLineNo:3
    });
    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toThrow("source.md:3: general activeCharacter 'ghost' does not match any character in the level");
  });

  it('reports imported-file itinerary errors using the imported source line', async () => {
    const sourceText = loadLevelFromUrlWithImportsText.replace(
      'load-level-from-url-with-imports-characters.md',
      'load-level-from-url-imported-itinerary.md'
    );
    _stubLevelUrlFetch({
      '/levels/source.md':sourceText,
      '/levels/load-level-from-url-imported-itinerary.md':loadLevelFromUrlImportedItineraryText
    });

    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toMatchObject({
      levelFilename:'load-level-from-url-imported-itinerary.md',
      errorLineNo:2
    });
    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toThrow('load-level-from-url-imported-itinerary.md:2: missing itinerary activity');
  });

  it('reports imported character property errors using the imported source line', async () => {
    _stubLevelUrlFetch({
      '/levels/source.md':loadLevelFromUrlImportedDuplicateCharacterPropertySourceText,
      '/levels/load-level-from-url-imported-duplicate-character-property.md':loadLevelFromUrlImportedDuplicateCharacterPropertyText
    });

    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toMatchObject({
      levelFilename:'load-level-from-url-imported-duplicate-character-property.md',
      errorLineNo:6
    });
    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toThrow("load-level-from-url-imported-duplicate-character-property.md:6: duplicate character hero entry 'description'");
  });

  it('reports imported room legend errors using the imported source line', async () => {
    _stubLevelUrlFetch({
      '/levels/source.md':loadLevelFromUrlImportedDuplicateRoomLegendEntrySourceText,
      '/levels/load-level-from-url-imported-duplicate-room-legend-entry.md':loadLevelFromUrlImportedDuplicateRoomLegendEntryText
    });

    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toMatchObject({
      levelFilename:'load-level-from-url-imported-duplicate-room-legend-entry.md',
      errorLineNo:10
    });
    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toThrow("load-level-from-url-imported-duplicate-room-legend-entry.md:10: duplicate room foyer entry 'H'");
  });

  it('reports imported conclusion subsection errors using the imported source line', async () => {
    _stubLevelUrlFetch({
      '/levels/source.md':loadLevelFromUrlImportedDuplicateConclusionPropertySourceText,
      '/levels/load-level-from-url-imported-duplicate-conclusion-property.md':loadLevelFromUrlImportedDuplicateConclusionPropertyText
    });

    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toMatchObject({
      levelFilename:'load-level-from-url-imported-duplicate-conclusion-property.md',
      errorLineNo:7
    });
    await expect(loadLevelFromUrl('/levels/source.md')).rejects.toThrow("load-level-from-url-imported-duplicate-conclusion-property.md:7: duplicate normalized entry 'mystery' conflicts with 'Mystery'");
  });
});