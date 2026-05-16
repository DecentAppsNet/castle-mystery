import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { baseUrl } from '@/common/urlUtil';
import styles from './SolutionView.module.css';
import Solution from "@/game/solutions/types/Solution"
import ClaimSolutionDialog from '../dialogs/ClaimSolutionDialog';
import ImageSet from '@/game/types/ImageSet';
import { claimSolution } from './interactions/solutions';

const SOLUTION_REVEAL_START_MSECS = 0;
const SOLUTION_REVEAL_TOTAL_MSECS = 4_050;

type Props = {
  solution:Solution,
  imageSet:ImageSet,
  cooldownUntilTime:number|null,
  onIncorrectClaim:() => void,
  onUpdate:(nextSolution:Solution) => void
}

function SolutionView({solution, imageSet, cooldownUntilTime, onIncorrectClaim, onUpdate}:Props) {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const [isHoldingLockedOverlay, setIsHoldingLockedOverlay] = useState(false);
  const [isRevealAnimating, setIsRevealAnimating] = useState(false);
  const previousSolutionRef = useRef({ id:solution.id, isLocked:solution.isLocked });
  const lockedImageUrl = baseUrl('/assets/ui/locked.svg');

  useLayoutEffect(() => {
    const previousSolution = previousSolutionRef.current;
    if (previousSolution.id !== solution.id) {
      previousSolutionRef.current = { id:solution.id, isLocked:solution.isLocked };
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
      return;
    }

    if (previousSolution.isLocked && !solution.isLocked) {
      setIsHoldingLockedOverlay(true);
      setIsRevealAnimating(false);
    } else if (solution.isLocked) {
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
    }

    previousSolutionRef.current = { id:solution.id, isLocked:solution.isLocked };
  }, [solution.id, solution.isLocked]);

  useEffect(() => {
    if (!isHoldingLockedOverlay || solution.isLocked || isRevealAnimating) return;
    const timeoutId = window.setTimeout(() => setIsRevealAnimating(true), SOLUTION_REVEAL_START_MSECS);
    return () => window.clearTimeout(timeoutId);
  }, [isHoldingLockedOverlay, isRevealAnimating, solution.isLocked]);

  useEffect(() => {
    if (!isRevealAnimating) return;
    const timeoutId = window.setTimeout(() => {
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
    }, SOLUTION_REVEAL_TOTAL_MSECS);
    return () => window.clearTimeout(timeoutId);
  }, [isRevealAnimating]);

  const statusIconClass = solution.isComplete ? styles.completeIcon : styles.incompleteIcon;
  const shouldRenderRevealOverlay = isRevealAnimating;
  const shouldRenderVisibleButton = !solution.isLocked || isHoldingLockedOverlay || shouldRenderRevealOverlay;
  const shouldRenderLockedOverlay = solution.isLocked || isHoldingLockedOverlay || shouldRenderRevealOverlay;
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
          <div
            className={obscuredOverlayClassName}
            aria-label={solution.isLocked ? 'Solution locked.' : 'Solution unlocking.'}
          >
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