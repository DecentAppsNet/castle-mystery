import { ChangeEvent, Fragment, ReactNode, useEffect, useRef, useState } from "react";

import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import Solution from "@/game/solutions/types/Solution";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "@/game/solutions/types/ClozeBlank";
import ClozeImage from "@/game/solutions/types/ClozeImage";
import ClozeSeparator from "@/game/solutions/types/ClozeSeparator";
import ClozeText from "@/game/solutions/types/ClozeText";
import ClozePartType from "@/game/solutions/types/ClozePartType";
import { duplicateSolution } from "@/game/solutions/types/Solution";
import { isSolutionMissingAnswers } from "@/game/solutions/solutionUtil";
import ImageSet from "@/game/types/ImageSet";

import styles from './ClaimSolutionDialog.module.css';

function _formatTimeRemaining(remainingMsecs:number):string {
  const remainingSeconds = Math.ceil(remainingMsecs / 1000);
  if (remainingSeconds < 60) {
    return `${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`;
  }

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return `${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
}

export type ClaimSolutionCallback = (solution:Solution) => boolean;

type Props = {
  isOpen:boolean,
  solution:Solution,
  imageSet:ImageSet,
  cooldownUntilTime:number|null,
  onClaim:ClaimSolutionCallback,
  onClose:(solution:Solution) => void
}

function ImageBitmapCanvas({ imageBitmap }: { imageBitmap:ImageBitmap }) {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const aspectRatio = imageBitmap.width / imageBitmap.height;
    canvas.style.height = '5vh';
    canvas.style.width = `${5 * aspectRatio}vh`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(imageBitmap, 0, 0);
  }, [imageBitmap]);

  return <canvas ref={canvasRef} className={styles.statementImage} aria-label='Solution reference image' />;
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

function _renderClozeStatementContent(solution:Solution, imageSet:ImageSet, onBlankAnswerChanged:(blankPartIndex:number, playerAnswerIndex:number) => void):ReactNode {
  return <div className={styles.statement}>
    {solution.parts.map((part, partIndex) => {
      if (part.type === ClozePartType.text) {
        const textPart = part as ClozeText;
        return <Fragment key={partIndex}>{textPart.text}</Fragment>;
      }

      if (part.type === ClozePartType.image) {
        const imagePart = part as ClozeImage;
        const imageBitmap = imageSet.get(imagePart.imageUrl) || null;
        return <span key={partIndex} className={styles.imagePartWrapper}>
          {imageBitmap ? <ImageBitmapCanvas imageBitmap={imageBitmap} /> : <span className={styles.missingImage}>[image unavailable]</span>}
        </span>;
      }

      if (part.type === ClozePartType.separator) {
        const separatorPart = part as ClozeSeparator;
        void separatorPart;
        return <hr key={partIndex} className={styles.separator} />;
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
  </div>;
}

function _renderSolutionStatus(solution:Solution, cooldownRemainingMsecs:number|null) {
  if (solution.isComplete) {
    return <p className={styles.status}>Your claimed solution is correct.</p>;
  }

  if (cooldownRemainingMsecs !== null) {
    return <p className={styles.status}>Your last claim was incorrect. You may guess again in {_formatTimeRemaining(cooldownRemainingMsecs)}.</p>;
  }

  if (isSolutionMissingAnswers(solution)) {
    return <p className={styles.status}>All blanks must be filled in before claiming the solution.</p>;
  }

  return <p className={styles.status}>Claim this as the solution only when you are confident.</p>;
}

function ClaimSolutionDialog({solution, imageSet, cooldownUntilTime, onClaim, onClose, isOpen}:Props) {
  const [draftSolution, setDraftSolution] = useState<Solution>(duplicateSolution(solution));
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setDraftSolution(duplicateSolution(solution));
  }, [solution]);

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
  }, [cooldownUntilTime, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (cooldownUntilTime === null || cooldownUntilTime <= Date.now()) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntilTime, isOpen]);

  const cooldownRemainingMsecs = cooldownUntilTime === null
    ? null
    : Math.max(0, cooldownUntilTime - now);
  const isOnCooldown = cooldownRemainingMsecs !== null && cooldownRemainingMsecs > 0;

  const isClaimDisabled = draftSolution.isComplete || isSolutionMissingAnswers(draftSolution) || isOnCooldown;
  const clozeStatementContent = _renderClozeStatementContent(draftSolution, imageSet, (blankPartIndex, playerAnswerIndex) => {
    setDraftSolution(from => _updateSolutionBlankAnswer(from, blankPartIndex, playerAnswerIndex));
  });
  const solutionStatusContent = _renderSolutionStatus(draftSolution, isOnCooldown ? cooldownRemainingMsecs : null);

  return (
    <ModalDialog onCancel={() => onClose(draftSolution)} title={solution.title} isOpen={isOpen}>
      {clozeStatementContent}
      {solutionStatusContent}
      <DialogFooter>
        <DialogButton text='Close' onClick={() => onClose(draftSolution)} />  
        <DialogButton text='Claim Solution' onClick={() => {
          onClaim(draftSolution);
        }} disabled={isClaimDisabled} isPrimary />
      </DialogFooter>
    </ModalDialog>
  );
}

export default ClaimSolutionDialog;