// Diagram layouts measure text; re-run them once the web fonts are in.
class Fonts {
  ready = $state(false);
  constructor() {
    document.fonts?.ready.then(() => (this.ready = true));
  }
}
export const fonts = new Fonts();

export const FONT_LABEL = "650 14px 'Atkinson Hyperlegible Next Variable', system-ui";
export const FONT_SMALL = "400 12px 'Atkinson Hyperlegible Next Variable', system-ui";
export const FONT_CODE = "500 12.5px 'JetBrains Mono Variable', ui-monospace, monospace";
