import { useState } from 'react';

import styles from './SolutionView.module.css';
import Solution from "@/game/solutions/types/Solution"
import ClaimSolutionDialog from '../dialogs/ClaimSolutionDialog';
import ImageSet from '@/game/types/ImageSet';
import { claimSolution } from './interactions/solutions';

type Props = {
  solution:Solution,
  imageSet:ImageSet,
  onUpdate:(nextSolution:Solution) => void
}

function SolutionView({solution, imageSet, onUpdate}:Props) {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);

  const statusIconClass = solution.isComplete ? styles.completeIcon : styles.incompleteIcon;

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
        onClaim={(nextSolution) => claimSolution(nextSolution, setModalDialogName, onUpdate)}
        onClose={(nextSolution) => { setModalDialogName(null); onUpdate(nextSolution); }}
      />
    </>
  );
}

export default SolutionView;