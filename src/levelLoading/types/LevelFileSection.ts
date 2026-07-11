type LevelFileSection = Readonly<{
  id:string,
  text:string,
  levelFilename:string,
  firstLineNo:number,
  runWithContext:Function
}>

export default LevelFileSection;