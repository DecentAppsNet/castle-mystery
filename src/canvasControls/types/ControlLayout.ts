import IdentifiedControl from "./IdentifiedControl";

type ControlLayout = {
  controls:IdentifiedControl[],
  hoveredControlId:string|null,
  canvasWidth:number, 
  canvasHeight:number
};

export default ControlLayout;