import { ChangeEvent, Fragment, ReactNode, useEffect, useState } from "react";

import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import Solution from "@/game/solutions/types/Solution";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "@/game/solutions/types/ClozeBlank";
import ClozeText from "@/game/solutions/types/ClozeText";
import ClozePartType from "@/game/solutions/types/ClozePartType";
import { duplicateSolution } from "@/game/solutions/types/Solution";
import { isSolutionMissingAnswers } from "@/game/solutions/solutionUtil";

import styles from './ClaimSolutionDialog.module.css';

export type ClaimSolutionCallback = (solution:Solution) => boolean;

type Props = {
  isOpen:boolean,
  solution:Solution,
  onClaim:ClaimSolutionCallback,
  onClose:(solution:Solution) => void
}

function _createBlankText(blank:ClozeBlank):string {
  if (blank.playerAnswerIndex === UNSPECIFIED_ANSWER) return '';
  return blank.availableAnswers[blank.playerAnswerIndex] || '';
}

function _updateSolutionBlankAnswer(solution:Solution, blankPartIndex:number, playerAnswerIndex:number):Solution {
  const updatedSolution = duplicateSolution(solution);
  const blank = updatedSolution.parts[blankPartIndex] as ClozeBlank;
  blank.playerAnswerIndex = playerAnswerIndex;
  return updatedSolution;
}

function _renderClozeStatementContent(solution:Solution, onBlankAnswerChanged:(blankPartIndex:number, playerAnswerIndex:number) => void):ReactNode {
  return <p className={styles.statement}>
    {solution.parts.map((part, partIndex) => {
      if (part.type === ClozePartType.text) {
        const textPart = part as ClozeText;
        return <Fragment key={partIndex}>{textPart.text}</Fragment>;
      }

      const blank = part as ClozeBlank;
      if (solution.isComplete) {
        return <span key={partIndex} className={styles.completedBlank}>{_createBlankText(blank)}</span>;
      }

      return <select
        key={partIndex}
        className={styles.blankSelect}
        aria-label={`Blank ${partIndex + 1}`}
        value={blank.playerAnswerIndex}
        onChange={(event:ChangeEvent<HTMLSelectElement>) => onBlankAnswerChanged(partIndex, Number(event.target.value))}
      >
        <option value={UNSPECIFIED_ANSWER}>Select…</option>
        {blank.availableAnswers.map((answer, answerIndex) =>
          <option key={answerIndex} value={answerIndex}>{answer}</option>
        )}
      </select>;
    })}
  </p>;
}

function _renderSolutionStatus(solution:Solution) {
  if (solution.isComplete) {
    return <p className={styles.status}>Your claimed solution is correct.</p>;
  }

  if (isSolutionMissingAnswers(solution)) {
    return <p className={styles.status}>All blanks must be filled in before claiming the solution.</p>;
  }

  return <p className={styles.status}>Claim this as the solution only when you are confident.</p>;
}

function ClaimSolutionDialog({solution, onClaim, onClose, isOpen}:Props) {
  const [draftSolution, setDraftSolution] = useState<Solution>(duplicateSolution(solution));

  useEffect(() => {
    setDraftSolution(duplicateSolution(solution));
  }, [solution]);

  const isClaimDisabled = draftSolution.isComplete || isSolutionMissingAnswers(draftSolution);
  const clozeStatementContent = _renderClozeStatementContent(draftSolution, (blankPartIndex, playerAnswerIndex) => {
    setDraftSolution(from => _updateSolutionBlankAnswer(from, blankPartIndex, playerAnswerIndex));
  });
  const solutionStatusContent = _renderSolutionStatus(draftSolution);

  return (
    <ModalDialog onCancel={() => onClose(draftSolution)} title={solution.title} isOpen={isOpen}>
      {clozeStatementContent}
      {solutionStatusContent}
      <DialogFooter>
        <DialogButton text='Close' onClick={() => onClose(draftSolution)} />
        <DialogButton text='Claim Solution' onClick={() => {
          const wasClaimed = onClaim(draftSolution);
          if (wasClaimed) onClose(draftSolution);
        }} disabled={isClaimDisabled} isPrimary />
      </DialogFooter>
    </ModalDialog>
  );
}

export default ClaimSolutionDialog;