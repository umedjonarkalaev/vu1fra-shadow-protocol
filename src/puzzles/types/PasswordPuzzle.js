/**
 * @fileoverview Terminal B Puzzle Type: Password Lab & Cipher Decode (`password_lab`).
 * Stage 1: Build a high-entropy 3-part passphrase from word chips (showing why weak passwords fail).
 * Stage 2: Decode an intercepted Base64/Caesar token by selecting the right shift/decoder chip.
 */

import { el } from '../PuzzleRegistry.js';

export const PasswordPuzzleType = {
  id: 'password_lab',
  schema: {
    requiredPayloadFields: ['weakExamples', 'wordChips', 'requiredChipCount', 'cipherText', 'cipherOptions', 'correctCipherId']
  },
  validatePayload(payload) {
    const errs = [];
    if (!Array.isArray(payload.wordChips) || payload.wordChips.length < payload.requiredChipCount) {
      errs.push('password_lab needs enough wordChips for requiredChipCount');
    }
    if (!Array.isArray(payload.cipherOptions) || !payload.correctCipherId) {
      errs.push('password_lab needs cipherOptions and correctCipherId');
    }
    return errs;
  },
  createController(data, ctx) {
    const payload = data.payload;
    /** @type {string[]} */
    const chosenWords = [];
    let selectedCipherId = null;

    return {
      mount(container) {
        container.textContent = '';
        const layout = el('div', { className: 'vu-pz-grid-2col' });

        // Left pane: Weak password audit + Passphrase builder
        const weakList = el('div', { className: 'vu-weak-list' });
        for (const w of payload.weakExamples) {
          weakList.appendChild(
            el('div', {
              className: 'vu-weak-item',
              text: `✗ ${w.pwd} — взлом: ${w.crackTimeRu}`
            })
          );
        }

        const phrasePreview = el('div', {
          className: 'vu-phrase-preview',
          text: 'Собери парольную фразу из 3 слов...'
        });

        const updatePreview = () => {
          if (chosenWords.length === 0) {
            phrasePreview.textContent = 'Собери парольную фразу из 3 слов...';
          } else {
            const joined = chosenWords.join('-');
            phrasePreview.textContent = `${joined} (${joined.length} симв. · Стойкость: ВЫСОКАЯ)`;
          }
        };

        const wordGrid = el('div', { className: 'vu-chip-grid' });
        for (const word of payload.wordChips) {
          const btn = el('button', {
            className: 'vu-choice-chip',
            text: word,
            attrs: { 'data-word-chip': word },
            onClick: () => {
              ctx.onBlip();
              const idx = chosenWords.indexOf(word);
              if (idx >= 0) {
                chosenWords.splice(idx, 1);
                btn.classList.remove('active');
              } else if (chosenWords.length < payload.requiredChipCount) {
                chosenWords.push(word);
                btn.classList.add('active');
              }
              updatePreview();
            }
          });
          wordGrid.appendChild(btn);
        }

        const leftPane = el('div', { className: 'vu-pz-pane' }, [
          el('div', { className: 'vu-pz-subhead', text: '1. Анализ уязвимых паролей и сборка парольной фразы:' }),
          weakList,
          phrasePreview,
          wordGrid
        ]);

        // Right pane: Caesar / Base64 decode selector
        const rightPane = el('div', { className: 'vu-pz-pane' }, [
          el('div', { className: 'vu-pz-subhead', text: '2. Декодирование перехваченного токена (Base64 / Цезарь):' }),
          el('div', { className: 'vu-cipher-box', text: payload.cipherText })
        ]);

        const cipherList = el('div', { className: 'vu-chip-list' });
        const optionButtons = [];
        for (const opt of payload.cipherOptions) {
          const btn = el('button', {
            className: 'vu-choice-chip',
            text: opt.labelRu,
            attrs: { 'data-cipher-id': opt.id },
            onClick: () => {
              ctx.onBlip();
              selectedCipherId = opt.id;
              for (const b of optionButtons) b.classList.remove('active');
              btn.classList.add('active');
            }
          });
          optionButtons.push(btn);
          cipherList.appendChild(btn);
        }
        rightPane.appendChild(cipherList);

        layout.appendChild(leftPane);
        layout.appendChild(rightPane);
        container.appendChild(layout);
      },

      evaluate() {
        if (chosenWords.length < payload.requiredChipCount) {
          return {
            ok: false,
            messageRu: `Выбери ровно ${payload.requiredChipCount} слова для стойкой парольной фразы.`
          };
        }
        if (selectedCipherId !== payload.correctCipherId) {
          return {
            ok: false,
            messageRu: 'Неверная расшифровка токена. Обрати внимание на формат строки.'
          };
        }
        return { ok: true };
      },

      hint() {
        return data.hintRu || 'Выбери любые 3 слова для длинной фразы и проверь декодировку Base64.';
      },

      explain() {
        return data.explanationRu;
      }
    };
  }
};
