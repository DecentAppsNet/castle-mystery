import styles from './DiscoveriesView.module.css';
import Discoveries from '@/game/types/Discoveries';
import DiscoveryItem from './DiscoveryItem';
import { ROOM_DISCOVERY_ICON_URL, UNKNOWN_CHARACTER_ICON_URL, UNKNOWN_ITEM_ICON_URL } from '@/game/discoveryIconUrlUtil';

type Props = {
  discoveries:Discoveries
};

type DiscoveryRow = {
  key:string,
  urls:readonly string[],
  discoveredCount:number,
  totalCount:number,
  singularLabel:string,
  pluralLabel:string
};

function _replaceMissingIconUrls(urls:readonly string[], placeholderUrl:string):string[] {
  return urls.map(url => url.trim() ? url : placeholderUrl);
}

function _createDiscoveryHoverText(discovery:Pick<DiscoveryRow, 'discoveredCount' | 'totalCount' | 'singularLabel' | 'pluralLabel'>):string {
  if (discovery.totalCount === 0) return `no ${discovery.pluralLabel} to discover`;
  const remainingCount = Math.max(0, discovery.totalCount - discovery.discoveredCount);
  if (remainingCount === 0) return `all ${discovery.pluralLabel} discovered`;
  if (remainingCount === 1) return `one ${discovery.singularLabel} left to discover`;
  return `${remainingCount} ${discovery.pluralLabel} left to discover`;
}

function _renderDiscoveryRow(discovery:DiscoveryRow) {
  const hoverText = _createDiscoveryHoverText(discovery);

  return <div key={discovery.key} className={styles.discoveryRow} title={hoverText} aria-label={hoverText}>
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
      totalCount:discoveries.characterCount,
      singularLabel:'character',
      pluralLabel:'characters'
    },
    {
      key:'rooms',
      urls:Array.from({ length:Math.min(discoveries.discoveredRoomCount, 3) }, () => ROOM_DISCOVERY_ICON_URL),
      discoveredCount:discoveries.discoveredRoomCount,
      totalCount:discoveries.roomCount,
      singularLabel:'room',
      pluralLabel:'rooms'
    },
    {
      key:'items',
      urls:_replaceMissingIconUrls(discoveries.discoveredItemIconUrls, UNKNOWN_ITEM_ICON_URL),
      discoveredCount:discoveries.discoveredItemIconUrls.length,
      totalCount:discoveries.itemCount,
      singularLabel:'item',
      pluralLabel:'items'
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