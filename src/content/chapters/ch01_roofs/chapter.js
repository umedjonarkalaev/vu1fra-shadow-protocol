/**
 * @fileoverview Chapter 1 complete data module ("Тихая крыша").
 */

import { CH01_STRINGS_RU } from './strings.ru.js';
import { CH01_COMICS } from './comics/comics.js';
import { CH01_PUZZLES } from './puzzles/puzzles.js';
import { LEVEL_01_ROOFS } from './levels/l1_roofs.js';
import { LEVEL_02_TOWER } from './levels/l2_tower.js';
import { LEVEL_03_SERVER } from './levels/l3_server.js';

export const CHAPTER_01 = {
  id: 'ch01_roofs',
  number: 'I',
  titleRu: 'Глава I · Тихая крыша',
  subtitleRu: 'Башня «Куроганэ Траст» · Сеть «Паутина»',
  teaserRu: 'Синдикат «Паутина» похищает сбережения стариков звонками от «службы безопасности банка». Проникни на 41-й этаж и добудь неопровержимые логи.',
  locked: false,
  stringsRu: CH01_STRINGS_RU,
  comics: CH01_COMICS,
  puzzles: CH01_PUZZLES,
  levels: [LEVEL_01_ROOFS, LEVEL_02_TOWER, LEVEL_03_SERVER]
};
