import Level from "./types/Level";
import TimeLabel from "./types/TimeLabel";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { parseNameValueLines, parseSections } from "@/common/markdownUtil";
import { parseTimestampToMsecs } from "@/common/timestampUtil";
import { loadItineraries } from "./levelItineraryLoader";
import {
  addRoomExitsFromRoomsSection,
  addRoomPositionMarkersFromSections,
  createRoomsFromMapSection,
  generateRoomWaypointsForLevel
} from "./levelRoomLayoutLoader";
import {
  createKnownPopulationEntryIds,
  loadRoomPopulation,
  parseRoomPopulationDefinitions
} from "./levelRoomPopulationLoader";

function _createEmptyLevel(duration:number = MSECS_IN_DAY):Level {
  return {
    rooms: [],
    characters: [],
    activeCharacterId: "",
    startTime: 0,
    duration,
    labels: _createTimeLabels(duration)
  };
}

function _parseTimeTextToMsecs(text:string):number {
  return parseTimestampToMsecs(text);
}

function _parseGeneralSection(generalSection:string):{ activeCharacterId:string, startTime:number|null } {
  const generalNameValues = parseNameValueLines(generalSection);
  return {
    activeCharacterId: generalNameValues.activeCharacter || "",
    startTime: generalNameValues.time ? _parseTimeTextToMsecs(generalNameValues.time) : null
  };
}

function _formatMinutesAsTimeLabel(minutes:number):string {
  const wholeMinutes = Math.round(minutes);
  const hours24 = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  if (hours24 === 0 && mins === 0) return "midnight";
  if (hours24 === 12 && mins === 0) return "noon";
  const suffix = hours24 < 12 || hours24 === 24 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (mins === 0) return `${hours12}${suffix}`;
  return `${hours12}:${mins.toString().padStart(2, '0')}${suffix}`;
}

function _createTimeLabels(duration:number):TimeLabel[] {
  const durationMinutes = duration / MSECS_IN_MINUTE;
  return [0, .25, .5, .75, 1].map(ratio => {
    const minutes = durationMinutes * ratio;
    return { minutes, label:_formatMinutesAsTimeLabel(minutes) };
  });
}

function _findSectionFirstContentLineNo(markdownText:string, sectionName:string, indentLevel:number = 1):number|null {
  const lines = markdownText.split('\n');
  const headingText = `${'#'.repeat(indentLevel)} ${sectionName}`;
  const nextHeadingPrefix = '#'.repeat(indentLevel) + ' ';
  const headingIndex = lines.findIndex(line => line.trim() === headingText);
  if (headingIndex === -1) return null;

  for (let i = headingIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith(nextHeadingPrefix)) return null;
    if (trimmedLine.length > 0) return i + 1;
  }

  return null;
}

export function loadLevelFromText(text:string, levelFilename:string = '<inline>'):Level {
  const sections = parseSections(text);
  const generalSection = _parseGeneralSection(sections.general || "");
  const itinerarySection = sections.itinerary || "";
  const itineraryFirstLineNo = _findSectionFirstContentLineNo(text, 'itinerary') || 1;
  let level = _createEmptyLevel();
  level = {
    ...level,
    activeCharacterId: generalSection.activeCharacterId || level.activeCharacterId,
    startTime: generalSection.startTime ?? level.startTime
  };
  const roomPopulationDefinitions = parseRoomPopulationDefinitions(sections.characters || "", sections.items || "");
  createRoomsFromMapSection(level, sections.map || "", sections.rooms || "");
  addRoomPositionMarkersFromSections(level, sections.rooms || "", createKnownPopulationEntryIds(roomPopulationDefinitions));
  addRoomExitsFromRoomsSection(level, sections.rooms || "");
  generateRoomWaypointsForLevel(level);
  loadRoomPopulation(level, sections.rooms || "", roomPopulationDefinitions);
  const itineraryData = loadItineraries(level, itinerarySection, levelFilename, itineraryFirstLineNo);
  level = {
    ...level,
    activeCharacterId: level.activeCharacterId || level.characters[0]?.id || "",
    characters: itineraryData.characters,
    duration: itineraryData.duration,
    labels: _createTimeLabels(itineraryData.duration)
  };
  return level;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const response = await fetch(levelFileUrl);
  const text = await response.text();
  return loadLevelFromText(text, levelFileUrl);
}