import Control from "./Control";

type ControlLayout = {
  controls:Control[],
  hoveredControlId:string|null,
  canvasWidth:number, 
  canvasHeight:number
};

export default ControlLayout;