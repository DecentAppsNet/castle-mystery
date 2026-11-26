import ModalDialog from "./ModalDialog";
import DialogButton from "./DialogButton";
import DialogFooter from "./DialogFooter";
import styles from './TextInputDialog.module.css';
import {FixInputCallback, ValidateCallback} from "./validationCallbacks";

import { useState, useEffect } from 'react';

type Props = {
  cancelText?:string,
  defaultValue:string,
  description:string,
  isOpen:boolean,
  onCancel?:() => void,
  onDelete?:() => void,
  onFixInput?:FixInputCallback,
  onSubmit:(value:string) => void,
  onSubmitValidate?:ValidateCallback,
  submitText?:string,
  title:string
}

function TextInputDialog(props:Props) {
  const {submitText, defaultValue, description, isOpen, onCancel, cancelText, onSubmit, onSubmitValidate, onFixInput, title} = props;
  const [value, setValue] = useState<string>(defaultValue);
  const [validationFailure, setValidationFailure] = useState<string|null>(null);
  const isSubmitDisabled = onSubmitValidate && onSubmitValidate(value) !== null;
  
  useEffect(() => {
    if (!isOpen) return;
    setValue(defaultValue);
    setValidationFailure(null);
  }, [isOpen, defaultValue]);
  
  function _onValueChange(nextValue:string) {
    if (onFixInput) {
      const fixedValue = onFixInput(nextValue);
      if (fixedValue !== null) nextValue = fixedValue;
    }
    setValue(nextValue);
    const failures = onSubmitValidate ? onSubmitValidate(nextValue) : null;
    if (failures) {
      setValidationFailure(failures.join(', '));
      return;
    }
    setValidationFailure(null);
  }
  
  const cancelButtonElement = onCancel ? <DialogButton text={cancelText ?? 'Cancel'} onClick={onCancel} /> : null;
  function _submit() {
    if (!isSubmitDisabled) onSubmit(value);
  }
  
  return (
    <ModalDialog isOpen={isOpen} title={title} onCancel={onCancel} onKeyDown={event => {
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) _submit();
    }}>
      <p>{description}</p>
      <input type='text' autoFocus className={styles.textInput} onChange={(event) => _onValueChange(event.target.value)} value={value}/>
      <p className={styles.validationText}>{validationFailure}</p>
      <DialogFooter>
        {cancelButtonElement}
        {props.onDelete && <DialogButton text='Delete' onClick={props.onDelete} />}
        <DialogButton text={submitText ?? 'Submit'} onClick={_submit} isPrimary disabled={isSubmitDisabled}/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default TextInputDialog;