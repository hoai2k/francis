// Every Special Grade boss definition, keyed by boss id (see entities/bosses.js
// for the fields). Story chapters pick one by id (story/chapters.js).
import { sugisawa_curse } from './sugisawa_curse.js';
import { finger_bearer } from './finger_bearer.js';
import { mahito } from './mahito.js';
import { hanami } from './hanami.js';
import { eso_kechizu, kechizu } from './eso_kechizu.js';
import { dagon } from './dagon.js';
import { choso } from './choso.js';
import { jogo } from './jogo.js';
import { mahoraga } from './mahoraga.js';
import { sukuna } from './sukuna.js';

export const BOSS_DEFS = { sugisawa_curse, finger_bearer, mahito, hanami, eso_kechizu, kechizu, dagon, choso, jogo, mahoraga, sukuna };
