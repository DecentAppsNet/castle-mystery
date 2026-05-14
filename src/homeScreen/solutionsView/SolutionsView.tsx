import styles from './SolutionsView.module.css';
import Solution from "@/game/solutions/types/Solution"
import SolutionView from './SolutionView';
import ImageSet from '@/game/types/ImageSet';

type Props = {
  solutions:Solution[],
  imageSet:ImageSet,
  onUpdate:(solutions:Solution[]) => void
}

function SolutionsView({solutions, imageSet, onUpdate}:Props) {
  const solutionsContent = solutions.map((s, i) => 
    <SolutionView key={s.id} imageSet={imageSet} solution={s} onUpdate={(nextSolution) => {
      const nextSolutions = [...solutions];
      nextSolutions[i] = nextSolution;
      onUpdate(nextSolutions);
    }} />
  );
  return <div className={styles.container}>
    <h1 className={styles.title}>Solutions</h1>
    <div className={styles.solutionList}>{solutionsContent}</div>
  </div>;
}

export default SolutionsView;