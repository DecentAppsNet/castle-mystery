/** Lists available level URLs and titles together with the last selected level index. */
type LevelManifest = Readonly<{
  levelUrls:string[],
  levelTitles:string[],
  lastLevelI:number;
}>;

export default LevelManifest;