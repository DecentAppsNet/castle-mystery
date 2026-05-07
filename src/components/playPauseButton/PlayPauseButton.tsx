import ContentButton from "../contentButton/ContentButton";
import { PAUSE_TEXT, PLAY_TEXT } from "./playPauseText";

type Props = {
  isPlaying:boolean
  disabled?:boolean
  onChange:(isPlaying:boolean) => void
}

function PlayPauseButton({isPlaying, disabled, onChange}:Props) {
  const text = isPlaying ? PAUSE_TEXT : PLAY_TEXT;
  return <ContentButton onClick={() => onChange(!isPlaying)} text={text} disabled={disabled} />;
}

export default PlayPauseButton;