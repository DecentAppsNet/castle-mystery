
type HatchLineStyle = {
  angle:number, // Angle of lines in radians. This also implies where hatch lines start from.
  spacing:number, // Fraction of canvas height between hatch lines, measured orthogonally to angle.
  lineWeightStart:number, // Line weight at start as a fraction of canvas height, measured orthogonally to angle.
  lineWeightEnd:number, // Line weight at end as a fraction of canvas height, measured orthogonally to angle.
  color:string // Color of lines.
}

export default HatchLineStyle;