import Control from "./Control";

type IdentifiedControl = Control & { readonly id:string };

export default IdentifiedControl;