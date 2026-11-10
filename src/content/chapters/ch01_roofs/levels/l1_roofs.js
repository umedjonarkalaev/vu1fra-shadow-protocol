/**
 * @fileoverview Chapter 1, Level 1: «Крыши» (Rooftops Tutorial, 136 tiles wide).
 * Teaches movement, sneak, jump, wall-jump, wall-run up vertical shafts, foreground cover,
 * shadow-dissolve under a patrolling surveillance drone, and reaching the tower entrance.
 */

function buildL1Rows() {
  const W = 136;
  const H = 14;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));

  const fillRect = (x0, y0, w, h, ch) => {
    for (let y = y0; y < y0 + h && y < H; y++) {
      for (let x = x0; x < x0 + w && x < W; x++) {
        if (y >= 0 && x >= 0) grid[y][x] = ch;
      }
    }
  };

  // Solid ground foundation across the level with two small rooftop gaps (3 tiles wide, easily jumped)
  fillRect(0, 11, 28, 3, '#');
  // Gap at x=28..30 (width 3) -> catch floor at y=12 so player can never fall out of world
  fillRect(28, 12, 3, 2, '#');
  fillRect(31, 11, 34, 3, '#');

  // Stepping stone rooftop platform at x=20..25, y=9
  fillRect(20, 9, 5, 1, '-');

  // Vertical Wall-Run Shaft #1 at x=46..54:
  // Runnable wall 'W' on x=52 from y=6 to y=10, with intermediate one-way ledges so both wall-run and step-jump work effortlessly
  fillRect(52, 6, 2, 5, 'W');
  fillRect(46, 9, 5, 1, '-');
  fillRect(47, 7, 5, 1, '-');
  fillRect(54, 7, 14, 1, '-');

  // Second stretch x=65..102
  fillRect(65, 11, 38, 3, '#');

  // Overhead catwalk above drone zone (x=72..92, y=8)
  fillRect(72, 8, 20, 1, '-');
  fillRect(68, 9, 4, 1, '-');

  // Vertical Wall-Run Chimney Shaft #2 at x=103..114
  fillRect(103, 11, 33, 3, '#');
  fillRect(106, 6, 2, 5, 'W');
  fillRect(112, 6, 2, 5, 'W');
  fillRect(101, 9, 5, 1, '-');
  fillRect(108, 8, 4, 1, '-');
  fillRect(114, 7, 10, 1, '-');

  // Boundary walls at x=0 and x=135
  fillRect(0, 0, 1, 14, '#');
  fillRect(135, 0, 1, 14, '#');

  return grid.map((r) => r.join(''));
}

export const LEVEL_01_ROOFS = {
  id: 'ch01_l1_roofs',
  titleRu: 'Уровень 1 · Крыши Нео-Эдо',
  subtitleRu: 'Путь сквозь туман к вентиляционному шлюзу башни «Куроганэ»',
  objectiveTextRu: 'Пройти по крышам в тени и проникнуть к шлюзу башни',
  exitObjectiveTextRu: 'Пройти сквозь туман к вратам башни «Куроганэ» на востоке',
  rows: buildL1Rows(),
  spawn: { x: 4, y: 11 },
  exit: { x: 130, y: 11 },
  checkpoints: [
    { id: 'cp_l1_start', x: 6, y: 11 },
    { id: 'cp_l1_mid', x: 66, y: 11 },
    { id: 'cp_l1_end', x: 118, y: 11 }
  ],
  coverSpots: [
    { id: 'cov_l1_1', x: 38, y: 11, kind: 'banner' },
    { id: 'cov_l1_2', x: 78, y: 11, kind: 'banner' },
    { id: 'cov_l1_3', x: 88, y: 11, kind: 'alcove' }
  ],
  shadowZones: [
    { x: 34, y: 7, w: 12, h: 4 },
    { x: 72, y: 8, w: 22, h: 3 },
    { x: 116, y: 7, w: 16, h: 4 }
  ],
  lights: [
    { x: 14, y: 8, radius: 5.5, color: 'amber', intensity: 0.8 },
    { x: 58, y: 5, radius: 5.0, color: 'amber', intensity: 0.75 },
    { x: 96, y: 8, radius: 5.5, color: 'amber', intensity: 0.8 },
    { x: 128, y: 8, radius: 5.5, color: 'cyan', intensity: 0.85 }
  ],
  props: [
    { type: 'torii', x: 10, y: 11 },
    { type: 'torii', x: 130, y: 11 }
  ],
  guards: [],
  drones: [
    {
      id: 'drone_l1_1',
      x: 82,
      y: 5.5,
      patrol: [
        { x: 74, y: 5.5 },
        { x: 91, y: 5.5 }
      ],
      speed: 2.0,
      aimAngleDeg: 90
    }
  ],
  cameras: [],
  terminals: [],
  tutorialHints: [
    { x: 5, y: 9, textRu: 'Лёгкий наклон джойстика — бесшумный шаг. Полный наклон — бег.' },
    { x: 26, y: 9, textRu: 'Нажми «Прыжок», чтобы преодолеть разлом между крышами.' },
    { x: 48, y: 9, textRu: 'Удерживай «Рывок» у бирюзовой стены для бега вверх по шахте.' },
    { x: 76, y: 9, textRu: 'В тени нажми «Тень» (Растворение) или укройся за знаменем от луча дрона.' }
  ],
  criticalPath: [
    { x: 4, y: 11, mode: 'walk' },
    { x: 27, y: 11, mode: 'walk' },
    { x: 32, y: 11, mode: 'jump' },
    { x: 48, y: 11, mode: 'walk' },
    { x: 51, y: 7, mode: 'wall_run' },
    { x: 66, y: 11, mode: 'walk' },
    { x: 102, y: 11, mode: 'walk' },
    { x: 114, y: 7, mode: 'wall_run' },
    { x: 130, y: 11, mode: 'walk' }
  ]
};
