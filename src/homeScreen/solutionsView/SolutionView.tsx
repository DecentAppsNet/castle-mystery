import { useState } from 'react';

import { baseUrl } from '@/common/urlUtil';
import styles from './SolutionView.module.css';
import Solution from "@/game/solutions/types/Solution"
import ClaimSolutionDialog from '../dialogs/ClaimSolutionDialog';
import ImageSet from '@/game/types/ImageSet';
import { claimSolution } from './interactions/solutions';

type Props = {
  solution:Solution,
  isRevealing:boolean,
  imageSet:ImageSet,
  cooldownUntilTime:number|null,
  onIncorrectClaim:() => void,
  onUpdate:(nextSolution:Solution) => void
}

function SolutionView({solution, isRevealing, imageSet, cooldownUntilTime, onIncorrectClaim, onUpdate}:Props) {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const lockedImageUrl = baseUrl('/assets/ui/locked.svg');

  const statusIconClass = solution.isComplete ? styles.completeIcon : styles.incompleteIcon;
  const shouldRenderRevealOverlay = isRevealing;
  const shouldRenderVisibleButton = !solution.isLocked || shouldRenderRevealOverlay;
  const shouldRenderLockedOverlay = solution.isLocked || shouldRenderRevealOverlay;
  const obscuredOverlayClassName = [
    styles.obscuredSolutionOverlay,
    shouldRenderRevealOverlay ? styles.obscuredSolutionRevealOverlay : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className={styles.solutionCardContainer}>
        {shouldRenderVisibleButton ? (
          <button type='button' className={styles.solutionButton} onClick={() => setModalDialogName(ClaimSolutionDialog.name)}>
            <span className={statusIconClass} />
            <span className={styles.solutionTitle}>{solution.title}</span>
          </button>
        ) : (
          <div className={styles.solutionCardPlaceholder} aria-hidden='true' />
        )}
        {shouldRenderLockedOverlay ? (
          <div className={obscuredOverlayClassName} aria-label={solution.isLocked ? 'Solution locked.' : 'Solution unlocking.'}>
            <img className={styles.lockedSolutionIcon} src={lockedImageUrl} alt="" aria-hidden='true' />
          </div>
        ) : null}
      </div>
      {shouldRenderVisibleButton ? (
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
      ) : null}
    </>
  );
}

export default SolutionView;