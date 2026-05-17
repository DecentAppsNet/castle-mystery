import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import itineraryExtraPunctuationText from './fixtures/itinerary-extra-punctuation.md?raw';
import itinerarySortingText from './fixtures/itinerary-sorting.md?raw';
import afterPreviousActivityOverlapText from './fixtures/after-previous-activity-overlap.md?raw';
import afterPreviousActivityBeforeLaterAbsoluteText from './fixtures/after-previous-activity-before-later-absolute.md?raw';
import afterPreviousActivityRepeatedWandersText from './fixtures/after-previous-activity-repeated-wanders.md?raw';
import afterPreviousActivityText from './fixtures/after-previous-activity.md?raw';
import invalidAtRoomDestinationText from './fixtures/invalid-at-room-destination.md?raw';
import invalidItineraryActivityText from './fixtures/invalid-itinerary-activity.md?raw';
import invalidMapLegendTileText from './fixtures/invalid-map-legend-tile.md?raw';
import invalidRoomLegendTileText from './fixtures/invalid-room-legend-tile.md?raw';
import invalidItineraryTimestampText from './fixtures/invalid-itinerary-timestamp.md?raw';
import kingacideItineraryText from './fixtures/kingacide-itinerary.md?raw';
import kingacideMinifiedSnapshotText from './fixtures/kingacide-minified-snapshot.md?raw';
import solutionsCaseInsensitiveCategoriesText from './fixtures/solutions-case-insensitive-categories.md?raw';
import solutionsCategoryMatchesText from './fixtures/solutions-category-matches.md?raw';
import duplicateUnlockText from './fixtures/duplicate-unlock.md?raw';
import duplicateCharacterSubsectionsCaseText from './fixtures/duplicate-character-subsections-case.md?raw';
import duplicateCharacterPlacementText from './fixtures/duplicate-character-placement.md?raw';
import duplicateItemSubsectionsCaseText from './fixtures/duplicate-item-subsections-case.md?raw';
import duplicateItemIdInventoryText from './fixtures/duplicate-item-id-inventory.md?raw';
import duplicateRoomIdMapLegendText from './fixtures/duplicate-room-id-map-legend.md?raw';
import duplicateRoomSubsectionsCaseText from './fixtures/duplicate-room-subsections-case.md?raw';
import duplicateSolutionCategoryGroupNamesText from './fixtures/duplicate-solution-category-group-names.md?raw';
import duplicateSolutionSubsectionsCaseText from './fixtures/duplicate-solution-subsections-case.md?raw';
import identitiesAllTitlesKnownText from './fixtures/identities-all-titles-known.md?raw';
import lowercaseTitleDefaultsText from './fixtures/lowercase-title-defaults.md?raw';
import missingSolutionPhraseText from './fixtures/missing-solution-phrase.md?raw';
import overrideGeneratedCategoryGroupCaseText from './fixtures/override-generated-category-group-case.md?raw';
import overrideRoomsText from './fixtures/override-rooms.md?raw';
import solutionsFallbackText from './fixtures/solutions-fallback.md?raw';
import solutionsTwoSubsectionsText from './fixtures/solutions-two-subsections.md?raw';
import titleDefaultsAndGeneratedIdentityText from './fixtures/title-defaults-and-generated-identity.md?raw';
import winSynopsisText from './fixtures/win-synopsis.md?raw';
import { clearSeed, setSeed } from '@/common/randUtil';
import LoadLevelException from '../levelLoading/LoadLevelException';
import { loadLevelFromText } from '../levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { findRoom } from '../roomUtil';
import ClozeBlank from '../solutions/types/ClozeBlank';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import atRoomMarkerText from '../integration-tests/fixtures/at-room-marker.md?raw';
import dropItemText from '../integration-tests/fixtures/drop-item.md?raw';
import giveItemNearText from '../integration-tests/fixtures/give-item-near.md?raw';
import giveItemWalkText from '../integration-tests/fixtures/give-item-walk.md?raw';
import wanderingTrappedText from '../integration-tests/fixtures/wandering-trapped.md?raw';
import solutionsImageSeparatorText from './fixtures/solutions-image-separator.md?raw';

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

  it('loads a file-relative activity before a later same-character absolute activity in file order', () => {
    const level = loadLevelFromText(afterPreviousActivityBeforeLaterAbsoluteText);
    const hero = level.characters.find(character => character.id === 'hero');
    const speechEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.SPEECH);

    expect(hero).not.toBeNull();
    expect(speechEvent?.startTime).toBe(30_000);
  });

  it('loads repeated file-relative wander activities without rescheduling conflicts', async () => {
    expect(() => loadLevelFromText(afterPreviousActivityRepeatedWandersText)).not.toThrow();
  });

  it('loads kingacide itinerary activities including title-based takes', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    const queen = level.characters.find(character => character.id === 'queen');
    const eastHall = level.rooms.find(room => room.id === 'east hall');
    const foyer = level.rooms.find(room => room.id === 'foyer');

    expect(queen?.items.map(item => item.id)).toContain('romance novel');
    expect(eastHall?.isObscured).toBe(true);
    expect(foyer?.isObscured).toBe(false);
    expect(level.solutions.map(solution => solution.title)).toEqual(['Identities']);
  });

  it('loads a minified kingacide snapshot with solutions and file-relative itinerary activity', () => {
    const level = loadLevelFromText(kingacideMinifiedSnapshotText, 'kingacide-minified-snapshot.md');

    expect(level.solutions.map(solution => solution.title)).toEqual(['Identities', 'The Missing Book']);
    expect(level.solutions[1].parts.length).toBeGreaterThan(0);
    expect(level.solutions[1].parts[0].type).toBe('blank');
  });

  it('parses one solution per subsection from the solutions section', () => {
    const level = loadLevelFromText(solutionsTwoSubsectionsText);

    expect(level.solutions.map(solution => solution.title)).toEqual(['First', 'Second']);
    expect(level.solutions[0].parts.length).toBeGreaterThan(0);
    expect(level.solutions[1].parts.length).toBeGreaterThan(0);
  });

  it('collects available answers from all matching categories for each blank', () => {
    const level = loadLevelFromText(solutionsCategoryMatchesText);
    const solution = level.solutions[0];
    const firstBlank = solution.parts[0] as ClozeBlank;
    const secondBlank = solution.parts[2] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['King', 'Queen', 'Prince']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
    expect(secondBlank.availableAnswers).toEqual(['searched', 'looked', 'lied']);
    expect(secondBlank.correctAnswerIndexes).toEqual([0, 1]);
  });

  it('falls back to blank values when no category contains all correct answers', () => {
    const level = loadLevelFromText(solutionsFallbackText);
    const solution = level.solutions[0];
    const firstBlank = solution.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Throne Room']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
    expect(solution.isLocked).toBe(false);
    expect(solution.unlockForItemId).toBe(null);
    expect(solution.unlockForSolutionId).toBe(null);
  });

  it('matches solution category phrases case-insensitively', () => {
    const level = loadLevelFromText(solutionsCaseInsensitiveCategoriesText, 'case-insensitive-categories.md', { validateUnlockPhrases:true });
    const solution = level.solutions[0];
    const firstBlank = solution.parts[0] as ClozeBlank;

    expect(firstBlank.availableAnswers).toEqual(['Book']);
    expect(firstBlank.correctAnswerIndexes).toEqual([0]);
  });

  it('parses cloze statement image and separator parts', () => {
    const level = loadLevelFromText(solutionsImageSeparatorText);
    const solution = level.solutions[0];

    expect(solution.parts.map(part => part.type)).toEqual(['image', 'text', 'blank', 'separator', 'image', 'text', 'blank']);
    expect((solution.parts[0] as { imageUrl:string }).imageUrl).toBe('/sprites/kingFace.png');
    expect((solution.parts[4] as { imageUrl:string }).imageUrl).toBe('/sprites/queenFace.png');
  });

  it('defaults titles from ids and generates identities for all characters', () => {
    const level = loadLevelFromText(titleDefaultsAndGeneratedIdentityText);
    const hall = findRoom(level.rooms, 'Hall');
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const crown = hall.items.find(item => item.id === 'crown');
    const identities = level.solutions.find(solution => solution.title === 'Identities') || null;
    const identityBlanks = (identities?.parts.filter(part => part.type === 'blank') || []) as ClozeBlank[];

    expect(hall.title).toBe('Grand Hall');
    expect(king?.title).toBe('His Majesty');
    expect(king?.isTitleKnown).toBe(true);
    expect(queen?.title).toBe('Queen');
    expect(queen?.isTitleKnown).toBe(false);
    expect(crown?.title).toBe('Crown');
    expect(identities?.title).toBe('Identities');
    expect(identities?.isLocked).toBe(false);
    expect(identityBlanks).toHaveLength(2);
    expect(identityBlanks[0].availableAnswers).toEqual(['His Majesty', 'Queen']);
    expect(identityBlanks[0].correctAnswerIndexes).toEqual([0]);
    expect(identityBlanks[1].availableAnswers).toEqual(['His Majesty', 'Queen']);
    expect(identityBlanks[1].correctAnswerIndexes).toEqual([1]);
  });

  it('marks identities complete when all character titles are already known', () => {
    const level = loadLevelFromText(identitiesAllTitlesKnownText);
    const identities = level.solutions.find(solution => solution.id === 'identities') || null;

    expect(identities).not.toBeNull();
    expect(identities?.isLocked).toBe(false);
    expect(identities?.isComplete).toBe(true);
  });

  it('defaults titles by preserving authored casing from subsection names', () => {
    const level = loadLevelFromText(lowercaseTitleDefaultsText);
    const room = findRoom(level.rooms, 'MacDonald Chamber');
    const character = level.characters.find(candidate => candidate.id === 'lady macbeth') || null;
    const item = room.items.find(candidate => candidate.id === 'royal decree') || null;
    const solution = level.solutions.find(candidate => candidate.id === 'the macdonald mystery') || null;

    expect(room.title).toBe('MacDonald Chamber');
    expect(character?.title).toBe('Lady MacBeth');
    expect(item?.title).toBe('royal decree');
    expect(solution?.title).toBe('The MacDonald Mystery');
  });

  it('loads winSynopsis from the general section and defaults it when omitted', () => {
    expect(loadLevelFromText(winSynopsisText).winSynopsis).toBe('The mystery is solved.');
    expect(loadLevelFromText(identitiesAllTitlesKnownText).winSynopsis).toBe('You completed the level.');
  });

  it('loads room position markers from room legends and grids', () => {
    const level = loadLevelFromText(atRoomMarkerText);
    const library = findRoom(level.rooms, 'Library');

    expect(library.positionMarkersById.sw).toEqual({ x:32, y:28 });
  });

  it('loads drop activities and removes dropped items from final carried inventory', () => {
    const level = loadLevelFromText(dropItemText);
    const hero = level.characters.find(character => character.id === 'hero');
    const dropEvent = hero?.itinerary.find(event => event.type === ItineraryEventType.DROP_ITEM) as { startTime:number, itemId:string, position:{ x:number, y:number } } | undefined;

    expect(dropEvent?.itemId).toBe('book');
    expect(hero?.items.map(item => item.id)).not.toContain('book');
    expect(findCharacterPose(hero!, dropEvent!.startTime).position).toEqual(dropEvent!.position);
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

  it('adds movement before a give activity when the recipient is farther away', () => {
    const level = loadLevelFromText(giveItemWalkText);
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const walkEvents = king?.itinerary.filter(event => event.type === ItineraryEventType.WALK) || [];
    const giveEvent = king?.itinerary.find(event => event.type === ItineraryEventType.GIVE_ITEM) as { startTime:number, itemId:string, recipientCharacterId:string } | undefined;
    const lastWalkEvent = walkEvents[walkEvents.length - 1] as { startTime:number, duration:number } | undefined;

    expect(walkEvents.length).toBeGreaterThan(0);
    expect(giveEvent).toBeDefined();
    expect(lastWalkEvent).toBeDefined();
    expect(giveEvent!.startTime).toBe(lastWalkEvent!.startTime + lastWalkEvent!.duration);
    expect(giveEvent!.itemId).toBe('book');
    expect(giveEvent!.recipientCharacterId).toBe('queen');
    expect(king?.items.map(item => item.id)).not.toContain('book');
    expect(queen?.items.map(item => item.id)).toContain('book');
  });

  it('parses itinerary lines with extra punctuation and whitespace outside quotes', () => {
    const level = loadLevelFromText(itineraryExtraPunctuationText);
    const king = level.characters.find(character => character.id === 'king');
    const queen = level.characters.find(character => character.id === 'queen');
    const library = findRoom(level.rooms, 'Library');
    const markerPosition = library.positionMarkersById.ne;
    const targetWaypoint = library.waypoints.reduce((nearestWaypoint, waypoint) => {
      if (!nearestWaypoint) return waypoint;
      const nearestDistanceSquared = (nearestWaypoint.position.x - markerPosition.x) ** 2 + (nearestWaypoint.position.y - markerPosition.y) ** 2;
      const distanceSquared = (waypoint.position.x - markerPosition.x) ** 2 + (waypoint.position.y - markerPosition.y) ** 2;
      return distanceSquared < nearestDistanceSquared ? waypoint : nearestWaypoint;
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
    expect(level.duration).toEqual(41_000);
  });

  it('wraps itinerary line errors with filename and line number', () => {
    try {
      loadLevelFromText(invalidItineraryActivityText, 'invalid-itinerary-activity.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('invalid-itinerary-activity.md');
      expect((error as LoadLevelException).errorLineNo).toBe(42);
      expect((error as LoadLevelException).message).toContain('invalid-itinerary-activity.md:42');
      expect((error as LoadLevelException).message).toMatch(/parse itinerary activity line/i);
    }
  });

  it('wraps invalid itinerary timestamps with filename and line number', () => {
    try {
      loadLevelFromText(invalidItineraryTimestampText, 'invalid-itinerary-timestamp.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-itinerary-timestamp.md:35');
      expect((error as LoadLevelException).message).toContain('invalid timestamp: 0:00:60');
    }
  });

  it('wraps unknown room marker references with filename and line number', () => {
    const invalidMarkerText = atRoomMarkerText.replace('@ Library.SW', '@ Library.NOPE');

    try {
      loadLevelFromText(invalidMarkerText, 'at-room-marker.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('at-room-marker.md:52');
      expect((error as LoadLevelException).message).toContain('unknown position marker Library.NOPE');
    }
  });

  it('wraps unknown @ room destinations with filename and line number', () => {
    try {
      loadLevelFromText(invalidAtRoomDestinationText, 'invalid-at-room-destination.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('invalid-at-room-destination.md:42');
      expect((error as LoadLevelException).message).toContain(`unknown room id 'West Hall'`);
    }
  });

  it('throws when a cloze answer phrase is missing from all solution categories', () => {
    try {
      loadLevelFromText(missingSolutionPhraseText, 'missing-solution-phrase.md', { validateUnlockPhrases:true });
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('missing-solution-phrase.md');
      expect((error as LoadLevelException).message).toContain('missing solution answer phrases from solution categories: Ghost');
    }
  });

  it('allows authored solution category overrides to replace default room names', () => {
    expect(() => loadLevelFromText(overrideRoomsText, 'override-rooms.md', { validateUnlockPhrases:true })).not.toThrow();
  });

  it('allows overriding generated category groups and reusing values across different groups', () => {
    expect(() => loadLevelFromText(overrideGeneratedCategoryGroupCaseText, 'override-generated-category-group-case.md', { validateUnlockPhrases:true })).not.toThrow();
  });

  it('throws when a solution defines duplicate unlock prerequisites', () => {
    try {
      loadLevelFromText(duplicateUnlockText, 'duplicate-unlock.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-unlock.md:15');
      expect((error as LoadLevelException).message).toContain('multiple unlockForItem lines');
    }
  });

  it('wraps duplicate normalized character subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateCharacterSubsectionsCaseText, 'duplicate-character-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-character-subsections-case.md:25');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'HERO' conflicts with 'Hero'`);
    }
  });

  it('wraps duplicate normalized item subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateItemSubsectionsCaseText, 'duplicate-item-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-item-subsections-case.md:23');
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

  it('wraps duplicate item ids across placed and inventory items with filename and line number', () => {
    try {
      loadLevelFromText(duplicateItemIdInventoryText, 'duplicate-item-id-inventory.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-item-id-inventory.md:32');
      expect((error as LoadLevelException).message).toContain(`duplicate item id 'book' in character hero inventory`);
    }
  });

  it('wraps duplicate normalized solution category group names with filename and line number', () => {
    try {
      loadLevelFromText(duplicateSolutionCategoryGroupNamesText, 'duplicate-solution-category-group-names.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-solution-category-group-names.md:21');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'rooms' conflicts with 'Rooms'`);
    }
  });

  it('wraps duplicate normalized solution subsection ids with filename and line number', () => {
    try {
      loadLevelFromText(duplicateSolutionSubsectionsCaseText, 'duplicate-solution-subsections-case.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('duplicate-solution-subsections-case.md:21');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'mystery' conflicts with 'Mystery'`);
    }
  });

  it('wraps room-layout failures with filename and line number', () => {
    try {
      loadLevelFromText(wanderingTrappedText, 'wandering-trapped.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('wandering-trapped.md:16');
      expect((error as LoadLevelException).message).toContain('no connected waypoints');
    }
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
      expect((error as LoadLevelException).message).toContain('duplicate-room-subsections-case.md:7');
      expect((error as LoadLevelException).message).toContain(`duplicate normalized entry 'HALL' conflicts with 'Hall'`);
    }
  });

});