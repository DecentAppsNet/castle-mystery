import ContentButton from "../contentButton/ContentButton";

type Props = {
  isPlaying:boolean
  disabled?:boolean
  onChange:(isPlaying:boolean) => void
}

// Unicode characters for play and pause (text-variant to prefer monochrome rendering).
const PLAY_TEXT = "\u25B6\uFE0E Play"; // ▶︎
const PAUSE_TEXT = "\u23F8\uFE0E Pause"; // ⏸︎

function PlayPauseButton({isPlaying, disabled, onChange}:Props) {
  const text = isPlaying ? PAUSE_TEXT : PLAY_TEXT;
  return <ContentButton onClick={() => onChange(!isPlaying)} text={text} disabled={disabled} />;
}

export default PlayPauseButton;