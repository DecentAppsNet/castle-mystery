import TextInputDialog from "@/components/modalDialogs/TextInputDialog";

const MAX_NOTE_LENGTH = 80;

type Props = {
  isOpen:boolean,
  existingText?:string,
  onDelete?:() => void,
  onSubmit:(text:string) => void,
  onCancel:() => void
}

function _onFixInput(value:string):string|null {
  value = value.replaceAll('\n', '');
  value = value.replaceAll('\r', '');
  value = value.replaceAll('\t', '');
  if (value.length >= MAX_NOTE_LENGTH) value = value.substring(0, MAX_NOTE_LENGTH);
  return value;
}

function _onSubmitValidate(value:string):string[]|null {
  if (value.trim() === '') return ['No text entered.'];
  return null;
}

function AddPageNoteDialog({ isOpen, existingText, onDelete, onSubmit, onCancel }:Props) {
  const isEditing = existingText !== undefined;
  const description = isEditing ? 'You can update or delete your note.' : 'Write a short note to add to the book. It is only for your use.';

  return <TextInputDialog 
  defaultValue={existingText ?? ''}
      description={description}
      isOpen={isOpen} 
      onSubmit={onSubmit} 
      onCancel={onCancel}
      onDelete={onDelete}
      onFixInput={_onFixInput}
      onSubmitValidate={_onSubmitValidate}
      submitText={isEditing ? 'Update' : 'Add'}
      title={"Your Note"} 
  />;
}

export default AddPageNoteDialog;