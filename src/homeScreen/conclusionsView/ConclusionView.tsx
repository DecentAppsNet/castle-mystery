import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { baseUrl } from '@/common/urlUtil';
import styles from './ConclusionView.module.css';
import Conclusion from "@/game/conclusions/types/Conclusion"
import ClaimConclusionDialog from '../dialogs/ClaimConclusionDialog';
import ImageSet from '@/game/types/ImageSet';
import { claimConclusion } from './interactions/conclusions';

const CONCLUSION_REVEAL_START_MSECS = 0;
const CONCLUSION_REVEAL_TOTAL_MSECS = 4_050;

type Props = {
  conclusion:Conclusion,
  imageSet:ImageSet,
  cooldownUntilTime:number|null,
  onIncorrectClaim:() => void,
  onUpdate:(nextConclusion:Conclusion) => void
}

function ConclusionView({conclusion, imageSet, cooldownUntilTime, onIncorrectClaim, onUpdate}:Props) {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const [isHoldingLockedOverlay, setIsHoldingLockedOverlay] = useState(false);
  const [isRevealAnimating, setIsRevealAnimating] = useState(false);
  const previousConclusionRef = useRef({ id:conclusion.id, isLocked:conclusion.isLocked });
  const lockedImageUrl = baseUrl('/assets/ui/locked.svg');

  useLayoutEffect(() => {
    const previousConclusion = previousConclusionRef.current;
    if (previousConclusion.id !== conclusion.id) {
      previousConclusionRef.current = { id:conclusion.id, isLocked:conclusion.isLocked };
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
      return;
    }

    if (previousConclusion.isLocked && !conclusion.isLocked) {
      setIsHoldingLockedOverlay(true);
      setIsRevealAnimating(false);
    } else if (conclusion.isLocked) {
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
    }

    previousConclusionRef.current = { id:conclusion.id, isLocked:conclusion.isLocked };
  }, [conclusion.id, conclusion.isLocked]);

  useEffect(() => {
    if (!isHoldingLockedOverlay || conclusion.isLocked || isRevealAnimating) return;
    const timeoutId = window.setTimeout(() => setIsRevealAnimating(true), CONCLUSION_REVEAL_START_MSECS);
    return () => window.clearTimeout(timeoutId);
  }, [isHoldingLockedOverlay, isRevealAnimating, conclusion.isLocked]);

  useEffect(() => {
    if (!isRevealAnimating) return;
    const timeoutId = window.setTimeout(() => {
      setIsHoldingLockedOverlay(false);
      setIsRevealAnimating(false);
    }, CONCLUSION_REVEAL_TOTAL_MSECS);
    return () => window.clearTimeout(timeoutId);
  }, [isRevealAnimating]);

  const statusIconClass = conclusion.isComplete ? styles.completeIcon : styles.incompleteIcon;
  const shouldRenderRevealOverlay = isRevealAnimating;
  const shouldRenderVisibleButton = !conclusion.isLocked || isHoldingLockedOverlay || shouldRenderRevealOverlay;
  const shouldRenderLockedOverlay = conclusion.isLocked || isHoldingLockedOverlay || shouldRenderRevealOverlay;
  const obscuredOverlayClassName = [
    styles.obscuredConclusionOverlay,
    shouldRenderRevealOverlay ? styles.obscuredConclusionRevealOverlay : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className={styles.conclusionCardContainer}>
        {shouldRenderVisibleButton ? (
          <button type='button' className={styles.conclusionButton} onClick={() => setModalDialogName(ClaimConclusionDialog.name)}>
            <span className={statusIconClass} />
            <span className={styles.conclusionTitle}>{conclusion.title}</span>
          </button>
        ) : (
          <div className={styles.conclusionCardPlaceholder} aria-hidden='true' />
        )}
        {shouldRenderLockedOverlay ? (
          <div
            className={obscuredOverlayClassName}
            aria-label={conclusion.isLocked ? 'Conclusion locked.' : 'Conclusion unlocking.'}
          >
            <img className={styles.lockedConclusionIcon} src={lockedImageUrl} alt="" aria-hidden='true' />
          </div>
        ) : null}
      </div>
      {shouldRenderVisibleButton ? (
        <ClaimConclusionDialog 
          isOpen={modalDialogName === ClaimConclusionDialog.name} 
          conclusion={conclusion}
          imageSet={imageSet}
          cooldownUntilTime={cooldownUntilTime}
          onClaim={(nextConclusion) => {
            const didClaim = claimConclusion(nextConclusion, setModalDialogName, onUpdate);
            if (!didClaim) onIncorrectClaim();
            return didClaim;
          }}
          onClose={(nextConclusion) => { setModalDialogName(null); onUpdate(nextConclusion); }}
        />
      ) : null}
    </>
  );
}

export default ConclusionView;