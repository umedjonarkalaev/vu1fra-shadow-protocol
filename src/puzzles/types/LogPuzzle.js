/**
 * @fileoverview Terminal C Puzzle Type: Log Forensics (`log_forensics`).
 * Player inspects server authentication logs and highlights the anomalous rows
 * (brute-force bursts, odd night hours, impossible travel between distant cities in minutes).
 */

import { el } from '../PuzzleRegistry.js';

export const LogPuzzleType = {
  id: 'log_forensics',
  schema: {
    requiredPayloadFields: ['entries', 'suspiciousIds']
  },
  validatePayload(payload) {
    const errs = [];
    if (!Array.isArray(payload.entries) || payload.entries.length === 0) {
      errs.push('log_forensics requires entries');
    }
    if (!Array.isArray(payload.suspiciousIds) || payload.suspiciousIds.length === 0) {
      errs.push('log_forensics requires suspiciousIds');
    }
    return errs;
  },
  createController(data, ctx) {
    const payload = data.payload;
    /** @type {Set<string>} */
    const flagged = new Set();

    return {
      mount(container) {
        container.textContent = '';
        const wrap = el('div', { className: 'vu-pz-pane' }, [
          el('div', {
            className: 'vu-pz-subhead',
            text: `Выдели аномальные записи в журнале безопасности (${payload.suspiciousIds.length}):`
          })
        ]);

        const list = el('div', { className: 'vu-log-table' });
        for (const row of payload.entries) {
          const btn = el('button', {
            className: 'vu-log-row',
            attrs: { 'data-log-id': row.id },
            onClick: () => {
              ctx.onBlip();
              if (flagged.has(row.id)) {
                flagged.delete(row.id);
                btn.classList.remove('active');
              } else {
                flagged.add(row.id);
                btn.classList.add('active');
              }
            }
          }, [
            el('span', { className: 'vu-log-time', text: row.time }),
            el('span', { className: 'vu-log-user', text: row.user }),
            el('span', { className: 'vu-log-geo', text: row.geo }),
            el('span', { className: 'vu-log-event', text: row.eventRu })
          ]);
          list.appendChild(btn);
        }

        wrap.appendChild(list);
        container.appendChild(wrap);
      },

      evaluate() {
        const expected = payload.suspiciousIds;
        if (flagged.size !== expected.length) {
          return {
            ok: false,
            messageRu: `Отмечено записей: ${flagged.size} из ${expected.length}. Ищи перебор паролей, ночной вход и «невозможное перемещение».`
          };
        }
        for (const id of expected) {
          if (!flagged.has(id)) {
            return {
              ok: false,
              messageRu: 'Одна из выбранных строк — штатная работа сотрудника. Проверь время и географию.'
            };
          }
        }
        return { ok: true };
      },

      hint() {
        return data.hintRu || 'Обрати внимание на серию ошибок входа подряд и смену города за 4 минуты.';
      },

      explain() {
        return data.explanationRu;
      }
    };
  }
};
