/**
 * @fileoverview Terminal A Puzzle Type: Phishing Inspector (`phishing_inspector`).
 * The player inspects incoming messages and selects all phishing red flags
 * (fake .example domain typosquatting, artificial urgency, mismatched link text vs inert href span).
 */

import { el } from '../PuzzleRegistry.js';

export const PhishingPuzzleType = {
  id: 'phishing_inspector',
  schema: {
    requiredPayloadFields: ['email', 'clues', 'correctClueIds']
  },
  validatePayload(payload) {
    const errs = [];
    if (!Array.isArray(payload.clues) || payload.clues.length === 0) {
      errs.push('phishing_inspector requires non-empty clues array');
    }
    if (!Array.isArray(payload.correctClueIds) || payload.correctClueIds.length === 0) {
      errs.push('phishing_inspector requires non-empty correctClueIds');
    }
    return errs;
  },
  createController(data, ctx) {
    const payload = data.payload;
    /** @type {Set<string>} */
    const selected = new Set();

    return {
      mount(container) {
        container.textContent = '';
        const layout = el('div', { className: 'vu-pz-grid-2col' });

        // Left column: inert inspected email view (fake links are inert non-clickable spans!)
        const mailHeader = el('div', { className: 'vu-mail-meta' }, [
          el('div', { className: 'vu-mail-row', text: `От: ${payload.email.from}` }),
          el('div', { className: 'vu-mail-row', text: `Тема: ${payload.email.subject}` }),
          el('div', { className: 'vu-mail-row vu-text-cyan', text: `Реальный адрес ссылки (href): ${payload.email.realHref}` })
        ]);

        const fakeLinkSpan = el('span', {
          className: 'vu-inert-link',
          text: payload.email.visibleLinkText
        });

        const mailBody = el('div', { className: 'vu-mail-body' }, [
          el('p', { text: payload.email.bodyIntro }),
          el('div', { className: 'vu-inert-link-box' }, [
            el('span', { text: 'Текст кнопки в письме: ' }),
            fakeLinkSpan
          ]),
          el('p', { className: 'vu-mail-footer', text: payload.email.bodyFooter || '' })
        ]);

        const leftPane = el('div', { className: 'vu-pz-pane' }, [mailHeader, mailBody]);

        // Right column: selectable forensic red-flag chips
        const rightPane = el('div', { className: 'vu-pz-pane' }, [
          el('div', {
            className: 'vu-pz-subhead',
            text: `Отметь все признаки фишинга (${payload.correctClueIds.length}):`
          })
        ]);

        const list = el('div', { className: 'vu-chip-list' });
        for (const clue of payload.clues) {
          const btn = el('button', {
            className: 'vu-choice-chip',
            text: clue.labelRu,
            attrs: { 'data-clue-id': clue.id },
            onClick: () => {
              ctx.onBlip();
              if (selected.has(clue.id)) {
                selected.delete(clue.id);
                btn.classList.remove('active');
              } else {
                selected.add(clue.id);
                btn.classList.add('active');
              }
            }
          });
          list.appendChild(btn);
        }
        rightPane.appendChild(list);

        layout.appendChild(leftPane);
        layout.appendChild(rightPane);
        container.appendChild(layout);
      },

      evaluate() {
        const expected = payload.correctClueIds;
        if (selected.size !== expected.length) {
          return {
            ok: false,
            messageRu: `Выбрано признаков: ${selected.size} из ${expected.length}. Проверь домен, срочность и реальный href.`
          };
        }
        for (const id of expected) {
          if (!selected.has(id)) {
            return {
              ok: false,
              messageRu: 'Один из выбранных пунктов не является признаком подделки.'
            };
          }
        }
        return { ok: true };
      },

      hint() {
        return data.hintRu || 'Сравни домен отправителя с настоящим доменом и посмотри на адрес href.';
      },

      explain() {
        return data.explanationRu;
      }
    };
  }
};
