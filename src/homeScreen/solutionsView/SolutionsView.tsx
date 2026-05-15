import styles from './SolutionsView.module.css';
import Solution from "@/game/solutions/types/Solution"
import SolutionView from './SolutionView';
import ImageSet from '@/game/types/ImageSet';
import { SolutionPhraseAnimationQueueItem } from './solutionPhraseAnimationUtil';

type Props = {
  solutions:Solution[],
  discoveredPhraseCount:number,
  totalPhraseCount:number,
  activePhraseAnimation:SolutionPhraseAnimationQueueItem|null,
  imageSet:ImageSet,
  solutionClaimCooldowns:Record<string, number>,
  onIncorrectClaim:(solutionId:string) => void,
  onUpdate:(solutions:Solution[]) => void
}

function SolutionsView({solutions, discoveredPhraseCount, totalPhraseCount, activePhraseAnimation, imageSet, solutionClaimCooldowns, onIncorrectClaim, onUpdate}:Props) {
  const solutionsContent = solutions.map((s, i) => 
    <SolutionView key={s.id} imageSet={imageSet} solution={s} isRevealing={Boolean(activePhraseAnimation?.unlockedSolutionIds.includes(s.id) && !s.isLocked)} cooldownUntilTime={solutionClaimCooldowns[s.id] ?? null} onIncorrectClaim={() => onIncorrectClaim(s.id)} onUpdate={(nextSolution) => {
      const nextSolutions = [...solutions];
      nextSolutions[i] = nextSolution;
      onUpdate(nextSolutions);
    }} />
  );
  return <div className={styles.container}>
    <h1 className={styles.title}>Solutions</h1>
    <div className={styles.solutionList}>{solutionsContent}</div>
    <div className={styles.counterContainer} aria-label={`${discoveredPhraseCount} of ${totalPhraseCount} phrases discovered`}>
      <div className={`${styles.counter} ${activePhraseAnimation ? styles.counterAnimated : ''}`}>
        <span className={styles.counterValue}>{discoveredPhraseCount} / {totalPhraseCount}</span>
        {activePhraseAnimation ? (
          <span key={activePhraseAnimation.id} className={styles.counterPhrase}>{activePhraseAnimation.phrase}</span>
        ) : null}
      </div>
    </div>
  </div>;
}

export default SolutionsView;