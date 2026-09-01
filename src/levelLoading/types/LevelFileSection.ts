/** A parsed top-level section with its normalized ID, source line index, and body text. */
type LevelFileSection = Readonly<{
  id:string,
  lineI:number,
  text:string
}>

export default LevelFileSection;