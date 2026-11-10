/**
 * @fileoverview Terminal E Puzzle Type: Intercepted Scam Call & OSINT Profile (`osint_scam`).
 * Player analyzes a phone-scam transcript alongside a fictional public social profile,
 * identifying both the psychological manipulation tactic and the leaked OSINT detail used against the victim.
 */

import { el } from '../PuzzleRegistry.js';

export const OsintScamPuzzleType = {
  id: 'osint_scam',
  schema: {
    requiredPayloadFields: [
      'transcriptRu',
      'profileRu',
      'tacticOptions',
      'correctTacticId',
      'osintOptions',
      'correctOsintId'
    ]
  },
  validatePayload(payload) {
    const errs = [];
    if (!payload.correctTacticId || !payload.correctOsintId) {
      errs.push('osint_scam requires correctTacticId and correctOsintId');
    }
    return errs;
  },
  createController(data, ctx) {
    const payload = data.payload;
    let chosenTactic = null;
    let chosenOsint = null;

    return {
      mount(container) {
        container.textContent = '';
        const layout = el('div', { className: 'vu-pz-grid-2col' });

        // Left pane: Intercepted scam call + public social media profile
        const leftPane = el('div', { className: 'vu-pz-pane' }, [
          el('div', { className: 'vu-pz-subhead', text: 'Перехват звонка «службы безопасности»:' }),
          el('div', { className: 'vu-mail-body', text: payload.transcriptRu }),
          el('div', { className: 'vu-pz-subhead', text: 'Открытая страница жертвы в соцсети (OSINT):' }),
          el('div', { className: 'vu-mail-body vu-osint-box', text: payload.profileRu })
        ]);

        // Right pane: Two selection questions
        const rightPane = el('div', { className: 'vu-pz-pane' });

        rightPane.appendChild(
          el('div', { className: 'vu-pz-subhead', text: '1. Какую уловку давления использует звонящий?' })
        );
        const tacticList = el('div', { className: 'vu-chip-list' });
        const tacticBtns = [];
        for (const opt of payload.tacticOptions) {
          const btn = el('button', {
            className: 'vu-choice-chip',
            text: opt.labelRu,
            attrs: { 'data-tactic-id': opt.id },
            onClick: () => {
              ctx.onBlip();
              chosenTactic = opt.id;
              for (const b of tacticBtns) b.classList.remove('active');
              btn.classList.add('active');
            }
          });
          tacticBtns.push(btn);
          tacticList.appendChild(btn);
        }
        rightPane.appendChild(tacticList);

        rightPane.appendChild(
          el('div', {
            className: 'vu-pz-subhead',
            text: '2. Какая открытая деталь (OSINT) заставила жертву поверить?'
          })
        );
        const osintList = el('div', { className: 'vu-chip-list' });
        const osintBtns = [];
        for (const opt of payload.osintOptions) {
          const btn = el('button', {
            className: 'vu-choice-chip',
            text: opt.labelRu,
            attrs: { 'data-osint-id': opt.id },
            onClick: () => {
              ctx.onBlip();
              chosenOsint = opt.id;
              for (const b of osintBtns) b.classList.remove('active');
              btn.classList.add('active');
            }
          });
          osintBtns.push(btn);
          osintList.appendChild(btn);
        }
        rightPane.appendChild(osintList);

        layout.appendChild(leftPane);
        layout.appendChild(rightPane);
        container.appendChild(layout);
      },

      evaluate() {
        if (!chosenTactic || !chosenOsint) {
          return {
            ok: false,
            messageRu: 'Ответь на оба вопроса: выбери приём манипуляции и утечку из профиля.'
          };
        }
        if (chosenTactic !== payload.correctTacticId) {
          return {
            ok: false,
            messageRu: 'Неверно определена психологическая уловка звонящего.'
          };
        }
        if (chosenOsint !== payload.correctOsintId) {
          return {
            ok: false,
            messageRu: 'Неверно указана деталь из открытого профиля (OSINT).'
          };
        }
        return { ok: true };
      },

      hint() {
        return data.hintRu || 'Посмотри, какую личную деталь из поста жертвы назвал мошенник и почему он запрещает класть трубку.';
      },

      explain() {
        return data.explanationRu;
      }
    };
  }
};
