import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";

type Props = {
  isOpen:boolean,
  onRevealLevel:() => void,
  onReturn:() => void
}

function DeveloperDialog({isOpen, onRevealLevel, onReturn}:Props) {
  return (
    <ModalDialog title="Developer Tools" onCancel={onReturn} isOpen={isOpen}>
      <p>You can't see this dialog unless you're a developer. Amazing, eh?</p>
      <DialogFooter>
        <DialogButton text="Complete Level" onClick={() => onRevealLevel()}/>
        <DialogButton text="Exit" onClick={() => onReturn()}/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default DeveloperDialog;
