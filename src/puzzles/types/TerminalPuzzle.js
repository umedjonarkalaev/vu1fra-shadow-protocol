/**
 * @fileoverview Terminal D Puzzle Type: Virtual FS Text Terminal (`virtual_terminal`).
 * Driven strictly by command buttons (chips: ls, cat <file>, cd <dir>, grep <word>, whoami, ping, scan)
 * over a virtual file system. Never invokes the OS keyboard.
 */

import { el } from '../PuzzleRegistry.js';

export const TerminalPuzzleType = {
  id: 'virtual_terminal',
  schema: {
    requiredPayloadFields: ['files', 'targetFile', 'targetKeyword', 'commands']
  },
  validatePayload(payload) {
    const errs = [];
    if (!payload.files || typeof payload.files !== 'object') {
      errs.push('virtual_terminal requires files map');
    }
    if (!payload.targetFile || !payload.files?.[payload.targetFile]) {
      errs.push('virtual_terminal targetFile must exist in files');
    }
    return errs;
  },
  createController(data, ctx) {
    const payload = data.payload;
    let foundEvidence = false;
    let currentDir = '/var/pautina';

    return {
      mount(container) {
        container.textContent = '';
        const layout = el('div', { className: 'vu-pz-grid-2col' });

        // Left: Terminal screen log output
        const screen = el('div', { className: 'vu-term-screen' });
        const appendLine = (text, cls = 'vu-term-line') => {
          const line = el('div', { className: cls, text });
          screen.appendChild(line);
          screen.scrollTop = screen.scrollHeight;
        };

        appendLine('SHADOW_OS v4.1 // ВИРТУАЛЬНАЯ КОНСОЛЬ НЕО-ЭДО', 'vu-term-line vu-text-cyan');
        appendLine(`Каталог: ${currentDir}. Найди и прочитай файл с уликами этажа 41.`);

        // Right: Command chips (zero OS keyboard required)
        const chipPane = el('div', { className: 'vu-pz-pane' }, [
          el('div', { className: 'vu-pz-subhead', text: 'Команды терминала (коснись для ввода):' })
        ]);

        const chipGrid = el('div', { className: 'vu-chip-list' });
        for (const cmdObj of payload.commands) {
          const btn = el('button', {
            className: 'vu-choice-chip vu-cmd-chip',
            text: `$ ${cmdObj.cmd}`,
            attrs: { 'data-cmd': cmdObj.cmd },
            onClick: () => {
              ctx.onBlip();
              btn.classList.add('active');
              appendLine(`vu1fra@kurogane:${currentDir}$ ${cmdObj.cmd}`, 'vu-term-line vu-text-amber');
              appendLine(cmdObj.outputRu);

              if (cmdObj.revealsTarget) {
                foundEvidence = true;
                appendLine('>>> УЛИКА ОБНАРУЖЕНА: Нажми «Проверить решение» для извлечения!', 'vu-term-line vu-text-cyan');
              }
            }
          });
          chipGrid.appendChild(btn);
        }

        chipPane.appendChild(chipGrid);
        layout.appendChild(screen);
        layout.appendChild(chipPane);
        container.appendChild(layout);
      },

      evaluate() {
        if (!foundEvidence) {
          return {
            ok: false,
            messageRu: `Сначала найди и выведи на экран содержимое файла ${payload.targetFile} или выполни grep.`
          };
        }
        return { ok: true };
      },

      hint() {
        return data.hintRu || 'Выполни ls, затем grep 41 или cat на подозрительном файле маршрутизации.';
      },

      explain() {
        return data.explanationRu;
      }
    };
  }
};
