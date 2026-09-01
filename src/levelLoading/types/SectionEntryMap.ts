import { SectionEntryWithLine } from "@/common/markdownUtil";

/** Maps normalized subsection names to entries retaining authored line information. */
type SectionEntryMap = Map<string, SectionEntryWithLine>;

export default SectionEntryMap;