/**
 * @fileoverview Chapter 1, Level 2: «Башня» (Kurogane Tower Perimeter & Lobby, 140 tiles wide).
 * Features 4 patrolling guards, light/shadow interplay, foreground cover spots, silent takedown opportunities,
 * Terminal A (Phishing Inspector) and Terminal B (Password Lab + Base64 decode).
 */

function buildL2Rows() {
  const W = 140;
  const H = 14;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));

  const fillRect = (x0, y0, w, h, ch) => {
    for (let y = y0; y < y0 + h && y < H; y++) {
      for (let x = x0; x < x0 + w && x < W; x++) {
        if (y >= 0 && x >= 0) grid[y][x] = ch;
      }
    }
  };

  // Continuous tower floor at y=11..13
  fillRect(0, 11, W, 3, '#');
  // Ceiling rafters at y=1
  fillRect(0, 0, W, 1, '#');

  // Boundary walls
  fillRect(0, 0, 1, H, '#');
  fillRect(W - 1, 0, 1, H, '#');

  // Overhead stealth rafters & mezzanine platforms
  fillRect(16, 9, 6, 1, '-');
  fillRect(22, 7, 18, 1, '-');

  // Wall-Run Shaft #1 at x=48..56 leading to Terminal A mezzanine
  fillRect(52, 6, 2, 5, 'W');
  fillRect(46, 9, 5, 1, '-');
  fillRect(54, 7, 18, 1, '-');

  // Mid-section rafters above guards 2 & 3
  fillRect(76, 9, 5, 1, '-');
  fillRect(81, 7, 16, 1, '-');

  // Wall-Run Shaft #2 at x=104..116 leading to Terminal B security mezzanine
  fillRect(106, 6, 2, 5, 'W');
  fillRect(100, 9, 5, 1, '-');
  fillRect(108, 7, 18, 1, '-');

  return grid.map((r) => r.join(''));
}

export const LEVEL_02_TOWER = {
  id: 'ch01_l2_tower',
  titleRu: 'Уровень 2 · Башня «Куроганэ»',
  subtitleRu: 'Внутренний атриум и узлы почтового шлюза корпорации',
  objectiveTextRu: 'Взломать терминалы почтового и крипто-шлюза',
  exitObjectiveTextRu: 'Подняться к лифту серверного 41-го этажа на востоке',
  midComicAfterTerminalId: 'term_b',
  rows: buildL2Rows(),
  spawn: { x: 4, y: 11 },
  exit: { x: 134, y: 11 },
  checkpoints: [
    { id: 'cp_l2_start', x: 5, y: 11 },
    { id: 'cp_l2_mid', x: 68, y: 11 },
    { id: 'cp_l2_end', x: 124, y: 11 }
  ],
  coverSpots: [
    { id: 'cov_l2_1', x: 24, y: 11, kind: 'banner' },
    { id: 'cov_l2_2', x: 42, y: 11, kind: 'alcove' },
    { id: 'cov_l2_3', x: 84, y: 11, kind: 'banner' },
    { id: 'cov_l2_4', x: 96, y: 11, kind: 'alcove' }
  ],
  shadowZones: [
    { x: 18, y: 7, w: 12, h: 4 },
    { x: 56, y: 4, w: 14, h: 3 },
    { x: 80, y: 7, w: 18, h: 4 },
    { x: 110, y: 4, w: 14, h: 3 }
  ],
  lights: [
    { x: 12, y: 8, radius: 5.5, color: 'amber', intensity: 0.8 },
    { x: 36, y: 8, radius: 5.0, color: 'amber', intensity: 0.75 },
    { x: 64, y: 5, radius: 5.0, color: 'cyan', intensity: 0.85 },
    { x: 92, y: 8, radius: 5.0, color: 'amber', intensity: 0.75 },
    { x: 118, y: 5, radius: 5.0, color: 'cyan', intensity: 0.85 }
  ],
  props: [
    { type: 'torii', x: 134, y: 11 }
  ],
  guards: [
    {
      id: 'guard_l2_1',
      x: 30,
      y: 11,
      patrol: [{ x: 22 }, { x: 38 }],
      facing: 1,
      speed: 1.55
    },
    {
      id: 'guard_l2_2',
      x: 62,
      y: 11,
      patrol: [{ x: 56 }, { x: 70 }],
      facing: -1,
      speed: 1.65
    },
    {
      id: 'guard_l2_3',
      x: 88,
      y: 11,
      patrol: [{ x: 78 }, { x: 96 }],
      facing: 1,
      speed: 1.65
    },
    {
      id: 'guard_l2_4',
      x: 118,
      y: 11,
      patrol: [{ x: 110 }, { x: 126 }],
      facing: -1,
      speed: 1.7
    }
  ],
  drones: [],
  cameras: [],
  terminals: [
    {
      id: 'term_a',
      x: 62,
      y: 7,
      puzzleId: 'term_a_phishing',
      labelRu: 'Терминал A · Почтовый шлюз'
    },
    {
      id: 'term_b',
      x: 116,
      y: 7,
      puzzleId: 'term_b_passwords',
      labelRu: 'Терминал B · Крипто-узел'
    }
  ],
  tutorialHints: [
    { x: 18, y: 9, textRu: 'Подойди к стражу со спины и нажми «Действие», чтобы бесшумно усыпить его.' },
    { x: 58, y: 5, textRu: 'У терминала нажми «Действие», когда рядом нет взгляда охраны.' }
  ],
  criticalPath: [
    { x: 4, y: 11, mode: 'walk' },
    { x: 48, y: 11, mode: 'walk' },
    { x: 55, y: 7, mode: 'wall_run' },
    { x: 62, y: 7, mode: 'walk' },
    { x: 70, y: 11, mode: 'walk' },
    { x: 102, y: 11, mode: 'walk' },
    { x: 109, y: 7, mode: 'wall_run' },
    { x: 116, y: 7, mode: 'walk' },
    { x: 134, y: 11, mode: 'walk' }
  ]
};
