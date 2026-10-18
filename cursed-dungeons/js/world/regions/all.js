// Every region. Placeholders register first; a Phase 2 region file imported
// after them replaces its placeholder (registerRegion with the same id).
import './placeholders.js';
import './jujutsu_high.js';
import './cursed_forest.js';
import './colony_tokyo1.js';
import './colony_sendai.js';
import './colony_sakurajima.js';
import './kyoto.js';
import './okinawa_coast.js';
import './shibuya.js';
import './shinjuku.js';
export { REGIONS, REGION_IDS, START_REGION, region, buildRegion, buildRegionSteps, cachedRegion, cachedRegionIds, neighbours, routeTo, gateSide, captureMeta, regionMeta, registerRegion, dropRegionCache } from './index.js';
