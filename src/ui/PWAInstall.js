/**
 * @fileoverview In-app PWA install prompt handler (`beforeinstallprompt` + iOS fallback).
 */

export class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.onChange = null;

    if (typeof window !== 'undefined') {
      this.isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.navigator.standalone === true;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        if (this.onChange) this.onChange();
      });

      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.deferredPrompt = null;
        if (this.onChange) this.onChange();
      });
    }
  }

  canInstall() {
    return !this.isInstalled && Boolean(this.deferredPrompt);
  }

  async promptInstall() {
    if (!this.deferredPrompt) return false;
    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        this.isInstalled = true;
        this.deferredPrompt = null;
        if (this.onChange) this.onChange();
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }
}

export const pwaInstall = new PWAInstallManager();
