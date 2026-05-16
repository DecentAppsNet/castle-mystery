import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";

type Props = {
  isOpen:boolean,
  synopsis:string,
  onReturn:() => void,
  onContinue:() => void
}

function WinLevelDialog({isOpen, synopsis, onContinue, onReturn}:Props) {
  return (
    <ModalDialog title="Level Complete" onCancel={onReturn} isOpen={isOpen}>
      <p>{synopsis}</p>
      <DialogFooter>
        <DialogButton text="Return" onClick={() => onReturn()}/>
        <DialogButton text="Continue" onClick={() => onContinue()}/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default WinLevelDialog;
