import { useState } from 'react';

import styles from './SolutionView.module.css';
import Solution from "@/game/solutions/types/Solution"
import ClaimSolutionDialog from '../dialogs/ClaimSolutionDialog';
import ImageSet from '@/game/types/ImageSet';
import { claimSolution } from './interactions/solutions';
import { convertNumberToRomanNumeral } from './romanNumeralUtil';

type Props = {
  solution:Solution,
  imageSet:ImageSet,
  cooldownUntilTime:number|null,
  onIncorrectClaim:() => void,
  onUpdate:(nextSolution:Solution) => void
}

function SolutionView({solution, imageSet, cooldownUntilTime, onIncorrectClaim, onUpdate}:Props) {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);

  const statusIconClass = solution.isComplete ? styles.completeIcon : styles.incompleteIcon;
  const obscuredCountdown = solution.obscuredRemainingPhrases.length;
  const obscuredCountdownDisplay = convertNumberToRomanNumeral(obscuredCountdown);

  if (solution.isObscured) {
    return (
      <div className={styles.obscuredSolutionCard} aria-label={`Solution hidden. ${obscuredCountdown} phrases remaining.`}>
        <span className={styles.obscuredSolutionCountdown}>{obscuredCountdownDisplay}</span>
      </div>
    );
  }

  return (
    <>
      <button type='button' className={styles.solutionButton} onClick={() => setModalDialogName(ClaimSolutionDialog.name)}>
        <span className={statusIconClass} />
        <span className={styles.solutionTitle}>{solution.title}</span>
      </button>
      <ClaimSolutionDialog 
        isOpen={modalDialogName === ClaimSolutionDialog.name} 
        solution={solution}
        imageSet={imageSet}
        cooldownUntilTime={cooldownUntilTime}
        onClaim={(nextSolution) => {
          const didClaim = claimSolution(nextSolution, setModalDialogName, onUpdate);
          if (!didClaim) onIncorrectClaim();
          return didClaim;
        }}
        onClose={(nextSolution) => { setModalDialogName(null); onUpdate(nextSolution); }}
      />
    </>
  );
}

export default SolutionView;