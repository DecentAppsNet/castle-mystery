/* This module groups conclusion-claim interaction helpers for the home-screen conclusions UI.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { countConclusionMistakes } from "@/game/conclusions/conclusionUtil";
import Conclusion, { duplicateConclusion } from "@/game/conclusions/types/Conclusion";

export function claimConclusion(conclusion:Conclusion, setModalDialogName:Function, onUpdateConclusion:(conclusion:Conclusion) => void):boolean {
  if (countConclusionMistakes(conclusion) === 0) {
    const nextConclusion = duplicateConclusion(conclusion);
    nextConclusion.isComplete = true;
    onUpdateConclusion(nextConclusion);
    setModalDialogName(null);
    return true;
  }
  return false;
}