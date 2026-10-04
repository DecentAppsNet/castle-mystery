/** HomeScreen can request closure without owning animation; false means the view unmounted. */
type LevelViewHandle = Readonly<{ close:() => Promise<boolean> }>;

export default LevelViewHandle;