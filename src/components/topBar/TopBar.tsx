// TopBar wraps the DecentBar with some props specific to the app. This TopBar component can be added to each screen of the app in a DRY way.
// For DecentBar docs, see "Using the DecentBar" at https://github.com/erikh2000/decent-portal .
import { useState } from "react";

import { isServingLocally } from "@/developer/devEnvUtil";
import DeveloperDialog from "@/developer/dialogs/DeveloperDialog";
import { DecentBar, Link, defaultOnClickLink } from "decent-portal";

const appLinks = [
  { description: "Support", url: "TODO ADD LINK" }, // An easy thing is to just change this link to a Github issues page for your repo.
  { description: "DevTools", url: "DevTools" }
];

const contributorText = 'Erik Hermansen, Peter Turner';

type Props = {
  levelUrls:readonly string[],
  onLoadLevel:(levelUrl:string) => void,
  onRevealLevel:() => void,
  onResetLevel:() => void
}

function TopBar({levelUrls, onLoadLevel, onRevealLevel, onResetLevel}:Props) {
  const links = isServingLocally() 
    ? [...appLinks]
    : [...appLinks].filter(link => link.description !== 'DevTools');

  const [modalDialogName, setModalDialogName] = useState<string|null>(null);

  function _onClickLink(link:Link) {
  if (link.url === 'DevTools') {
      setModalDialogName(DeveloperDialog.name);
      return;
    }
    defaultOnClickLink(link);
  }

  return <>
    <DecentBar appLinks={links} contributorText={contributorText} onClickLink={_onClickLink}/>
    {modalDialogName === DeveloperDialog.name && <DeveloperDialog
      levelUrls={levelUrls}
      onLoadLevel={levelUrl => { setModalDialogName(null); onLoadLevel(levelUrl); }}
      onReturn={() => setModalDialogName(null)} 
      onRevealLevel={() => { setModalDialogName(null); onRevealLevel(); }} 
      onResetLevel={() => { setModalDialogName(null); onResetLevel(); }}
    />}
  </>;
}

export default TopBar;