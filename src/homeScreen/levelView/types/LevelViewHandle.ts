/** HomeScreen can request closure without owning animation; false means the view unmounted. */
type LevelViewHandle = Readonly<{ close:(hideBookFirst?:boolean) => Promise<boolean> }>;

export default LevelViewHandle;