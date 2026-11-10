/**
 * @fileoverview Chapter 1, Level 3: «Серверный этаж» (41st Floor Server Core, 144 tiles wide).
 * Features patrolling guards + 1 sweeping security camera, 2 wall-run shafts, shadow zones,
 * and Terminals C (Log Forensics), D (Virtual FS Text Terminal), and E (Scam Call + OSINT).
 */

function buildL3Rows() {
  const W = 144;
  const H = 14;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));

  const fillRect = (x0, y0, w, h, ch) => {
    for (let y = y0; y < y0 + h && y < H; y++) {
      for (let x = x0; x < x0 + w && x < W; x++) {
        if (y >= 0 && x >= 0) grid[y][x] = ch;
      }
    }
  };

  // Floor & ceiling
  fillRect(0, 11, W, 3, '#');
  fillRect(0, 0, W, 1, '#');
  fillRect(0, 0, 1, H, '#');
  fillRect(W - 1, 0, 1, H, '#');

  // Sector 1: Server gallery leading to Terminal C (x=36, y=7)
  fillRect(18, 9, 6, 1, '-');
  fillRect(24, 7, 18, 1, '-');

  // Sector 2: Wall-Run Shaft #1 at x=56..64 leading to Terminal D (x=72, y=7)
  fillRect(60, 6, 2, 5, 'W');
  fillRect(54, 9, 5, 1, '-');
  fillRect(62, 7, 18, 1, '-');

  // Sector 3: Wall-Run Shaft #2 at x=98..108 leading to Terminal E (x=116, y=7)
  fillRect(102, 6, 2, 5, 'W');
  fillRect(96, 9, 5, 1, '-');
  fillRect(104, 7, 18, 1, '-');

  return grid.map((r) => r.join(''));
}

export const LEVEL_03_SERVER = {
  id: 'ch01_l3_server',
  titleRu: 'Уровень 3 · Серверный этаж 41',
  subtitleRu: 'Центральное хранилище «Паутины» в башне «Куроганэ Траст»',
  objectiveTextRu: 'Собрать все 3 улики из серверных терминалов C, D и E',
  exitObjectiveTextRu: 'Покинуть 41-й этаж через восточный шлюз на крышу',
  rows: buildL3Rows(),
  spawn: { x: 4, y: 11 },
  exit: { x: 138, y: 11 },
  checkpoints: [
    { id: 'cp_l3_start', x: 5, y: 11 },
    { id: 'cp_l3_mid1', x: 50, y: 11 },
    { id: 'cp_l3_mid2', x: 90, y: 11 }
  ],
  coverSpots: [
    { id: 'cov_l3_1', x: 22, y: 11, kind: 'alcove' },
    { id: 'cov_l3_2', x: 46, y: 11, kind: 'banner' },
    { id: 'cov_l3_3', x: 82, y: 11, kind: 'alcove' },
    { id: 'cov_l3_4', x: 112, y: 11, kind: 'banner' }
  ],
  shadowZones: [
    { x: 24, y: 4, w: 18, h: 3 },
    { x: 64, y: 4, w: 16, h: 3 },
    { x: 80, y: 7, w: 14, h: 4 },
    { x: 106, y: 4, w: 16, h: 3 }
  ],
  lights: [
    { x: 14, y: 8, radius: 5.0, color: 'cyan', intensity: 0.8 },
    { x: 36, y: 5, radius: 4.5, color: 'cyan', intensity: 0.85 },
    { x: 72, y: 5, radius: 4.5, color: 'cyan', intensity: 0.85 },
    { x: 116, y: 5, radius: 4.5, color: 'cyan', intensity: 0.85 },
    { x: 134, y: 8, radius: 5.5, color: 'amber', intensity: 0.85 }
  ],
  props: [
    { type: 'torii', x: 138, y: 11 }
  ],
  guards: [
    {
      id: 'guard_l3_1',
      x: 32,
      y: 11,
      patrol: [{ x: 20 }, { x: 44 }],
      facing: 1,
      speed: 1.7
    },
    {
      id: 'guard_l3_2',
      x: 72,
      y: 11,
      patrol: [{ x: 62 }, { x: 84 }],
      facing: -1,
      speed: 1.75
    },
    {
      id: 'guard_l3_3',
      x: 114,
      y: 11,
      patrol: [{ x: 104 }, { x: 126 }],
      facing: 1,
      speed: 1.75
    }
  ],
  drones: [],
  cameras: [
    {
      id: 'cam_l3_1',
      x: 88,
      y: 4.2,
      minAngleDeg: 45,
      maxAngleDeg: 135,
      sweepSpeed: 0.85
    }
  ],
  terminals: [
    {
      id: 'term_c',
      x: 34,
      y: 7,
      puzzleId: 'term_c_logs',
      labelRu: 'Терминал C · Журнал входов'
    },
    {
      id: 'term_d',
      x: 72,
      y: 7,
      puzzleId: 'term_d_terminal',
      labelRu: 'Терминал D · Консоль ядра'
    },
    {
      id: 'term_e',
      x: 114,
      y: 7,
      puzzleId: 'term_e_osint',
      labelRu: 'Терминал E · Архив «Паука»'
    }
  ],
  tutorialHints: [
    { x: 82, y: 9, textRu: 'Следи за сектором обзора настенной камеры и проходи в фазе отворота.' }
  ],
  criticalPath: [
    { x: 4, y: 11, mode: 'walk' },
    { x: 16, y: 11, mode: 'walk' },
    { x: 18, y: 9, mode: 'jump' },
    { x: 22, y: 9, mode: 'walk' },
    { x: 25, y: 7, mode: 'jump' },
    { x: 34, y: 7, mode: 'walk' },
    { x: 54, y: 11, mode: 'walk' },
    { x: 63, y: 7, mode: 'wall_run' },
    { x: 72, y: 7, mode: 'walk' },
    { x: 96, y: 11, mode: 'walk' },
    { x: 105, y: 7, mode: 'wall_run' },
    { x: 114, y: 7, mode: 'walk' },
    { x: 138, y: 11, mode: 'walk' }
  ]
};
