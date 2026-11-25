import { useState } from "react";
import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";

type Props = {
  levelUrls:readonly string[],
  onLoadLevel:(levelUrl:string) => void,
  onRevealLevel:() => void,
  onResetLevel:() => void,
  onReturn:() => void
}

function DeveloperDialog({levelUrls, onLoadLevel, onRevealLevel, onResetLevel, onReturn}:Props) {
  const [selectedUrl, setSelectedUrl] = useState('');
  const levelUrl = levelUrls.includes(selectedUrl) ? selectedUrl : levelUrls[0];

  return (
    <ModalDialog title="Developer Tools" onCancel={onReturn} isOpen>
      <p>You can't see this dialog unless you're a developer. Amazing, eh?</p>
      <label>
        Level URL{' '}
        <select value={levelUrl ?? ''} disabled={!levelUrl} onChange={event => setSelectedUrl(event.target.value)}>
          {levelUrls.map(url => <option key={url} value={url}>{url}</option>)}
        </select>
      </label>
      <DialogFooter>
        <DialogButton text="Visit Level" disabled={!levelUrl} onClick={() => { if (levelUrl) onLoadLevel(levelUrl); }}/>
        <DialogButton text="Complete Level" onClick={() => onRevealLevel()}/>
        <DialogButton text="Reset Level" onClick={() => onResetLevel()}/>
        <DialogButton text="Exit" onClick={() => onReturn()}/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default DeveloperDialog;
