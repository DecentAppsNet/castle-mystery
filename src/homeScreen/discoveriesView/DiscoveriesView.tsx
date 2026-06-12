import styles from './DiscoveriesView.module.css';
import Discoveries from '@/game/types/Discoveries';
import DiscoveryItem from './DiscoveryItem';

type Props = {
  discoveries:Discoveries
};

type DiscoveryRow = {
  key:string,
  urls:readonly string[],
  discoveredCount:number,
  totalCount:number
};

const ROOM_DISCOVERY_ICON_URL = '/assets/ui/roomCount.png';
const UNKNOWN_ITEM_ICON_URL = '/assets/ui/unknownItem.png';
const UNKNOWN_CHARACTER_ICON_URL = '/assets/ui/unknownCharacter.png';

function _replaceMissingIconUrls(urls:readonly string[], placeholderUrl:string):string[] {
  return urls.map(url => url.trim() ? url : placeholderUrl);
}

function _renderDiscoveryRow(discovery:DiscoveryRow) {
  return <div key={discovery.key} className={styles.discoveryRow}>
    <DiscoveryItem urls={discovery.urls} />
    <span className={styles.discoveryCount}>{discovery.discoveredCount} of {discovery.totalCount}</span>
  </div>;
}

function DiscoveriesView({discoveries}:Props) {
  const discoveryRows:DiscoveryRow[] = [
    {
      key:'characters',
      urls:_replaceMissingIconUrls(discoveries.discoveredCharacterIconUrls, UNKNOWN_CHARACTER_ICON_URL),
      discoveredCount:discoveries.discoveredCharacterIconUrls.length,
      totalCount:discoveries.characterCount
    },
    {
      key:'rooms',
      urls:Array.from({ length:Math.min(discoveries.discoveredRoomCount, 3) }, () => ROOM_DISCOVERY_ICON_URL),
      discoveredCount:discoveries.discoveredRoomCount,
      totalCount:discoveries.roomCount
    },
    {
      key:'items',
      urls:_replaceMissingIconUrls(discoveries.discoveredItemIconUrls, UNKNOWN_ITEM_ICON_URL),
      discoveredCount:discoveries.discoveredItemIconUrls.length,
      totalCount:discoveries.itemCount
    }
  ];

  return <div className={styles.container}>
    <h1 className={styles.title}>Discoveries</h1>
    <div className={styles.discoveryList}>
      {discoveryRows.map(_renderDiscoveryRow)}
    </div>
  </div>;
}

export default DiscoveriesView;