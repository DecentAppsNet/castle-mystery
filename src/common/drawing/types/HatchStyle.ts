type HatchStyle = {
  angle:number, // Angle of lines in radians. This also implies where hatch lines start from.
  spacing:number, // Canvas pixels between hatch lines traveling orthogonally to angle.
  lineWeightStart:number, // Line weight in canvas pixels at start of hatch line, measured orthogonally to angle
  lineWeightEnd:number, // Line weight in canvas pixels at end of hatch line.
  color:string // Color of lines.
}

export default HatchStyle;