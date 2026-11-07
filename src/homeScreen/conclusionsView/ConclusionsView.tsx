import styles from './ConclusionsView.module.css';
import Conclusion from "@/game/conclusions/types/Conclusion"
import ConclusionView from './ConclusionView';
import ImageSet from '@/game/types/ImageSet';
import ContentButton from '@/components/contentButton/ContentButton';

type Props = {
  conclusions:Conclusion[],
  imageSet:ImageSet,
  conclusionClaimCooldowns:Record<string, number>,
  onIncorrectClaim:(conclusionId:string) => void,
  onReset:() => void,
  onUpdate:(conclusions:Conclusion[]) => void
}

function ConclusionsView({conclusions, imageSet, conclusionClaimCooldowns, onIncorrectClaim, onReset, onUpdate}:Props) {
  const conclusionsContent = conclusions.map((s, i) => 
    <ConclusionView key={s.id} imageSet={imageSet} conclusion={s} cooldownUntilTime={conclusionClaimCooldowns[s.id] ?? null} onIncorrectClaim={() => onIncorrectClaim(s.id)} onUpdate={(nextConclusion) => {
      const nextConclusions = [...conclusions];
      nextConclusions[i] = nextConclusion;
      onUpdate(nextConclusions);
    }} />
  );
  return <div className={styles.container}>
    <h1 className={styles.title}>Conclusions</h1>
    <div className={styles.conclusionList}>{conclusionsContent}</div>
    <div className={styles.actions}>
      <ContentButton text='Reset Level' onClick={onReset} />
    </div>
  </div>;
}

export default ConclusionsView;