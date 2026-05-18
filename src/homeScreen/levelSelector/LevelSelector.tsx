import { useState, useEffect } from 'react';
import { assertNonNullable } from 'decent-portal';

import Selector from "@/components/selector/Selector";
import LevelManifest from "@/levelLoading/types/LevelManifest";

type Props = {
  levelManifest:LevelManifest|null
  onSelect:(levelUrl:string) => void
}

function LevelSelector({levelManifest, onSelect}:Props) {
  const [selectedOptionNo, setSelectedOptionNo] = useState<number>(0);

  if (!levelManifest) return null;

  useEffect(() => {
    if (!levelManifest) return;
    setSelectedOptionNo(levelManifest.lastLevelI);
  }, [levelManifest]);

  function _select(optionNo:number) {
    assertNonNullable(levelManifest);
    setSelectedOptionNo(optionNo);
    onSelect(levelManifest.levelUrls[optionNo]);
  }

  const optionNames = levelManifest.levelTitles;
  return <Selector optionNames={optionNames} selectedOptionNo={selectedOptionNo} onClick={_select}/>;
}

export default LevelSelector;