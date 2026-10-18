// Every quest. Regions load first (main quests name their regions).
import '../world/regions/all.js';
import './main.js';
import './side.js';
import './colonies.js';
import './kyoto_okinawa.js';
import './cities.js';
export { QuestSystem, QUESTS, QUEST_ORDER, registerQuest, quest, anchorPos, migrateQuests } from './index.js';
