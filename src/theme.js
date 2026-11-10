/**
 * @fileoverview Palette tokens and typographic/visual theme constants for VU1FRA // SHADOW PROTOCOL.
 * Enforces the "dark silhouettes, soft glow" Neo-Edo visual identity.
 */

export const PALETTE = Object.freeze({
  ink: '#05070d',
  night: '#0b1020',
  indigo: '#141a33',
  fog: '#8fa3c7',
  moon: '#e8e2cf',
  cyan: '#3df2ff',
  amber: '#ffb14a',
  crimson: '#ff3b4e',
  hanko: '#c4161c',
  shadowRim: '#4a608a',
  paper: '#d8d2c5',
  mutedText: '#7c8ea8'
});

export const FONTS = Object.freeze({
  display: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", serif'
});

export const THEME = Object.freeze({
  palette: PALETTE,
  fonts: FONTS,
  ui: {
    glassBg: 'rgba(11, 16, 32, 0.86)',
    glassBorder: 'rgba(143, 163, 199, 0.24)',
    cyanBorder: 'rgba(61, 242, 255, 0.45)',
    hankoBg: '#c4161c'
  }
});
