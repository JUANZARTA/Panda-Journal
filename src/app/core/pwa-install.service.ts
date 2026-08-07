import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Angular todavía no tipa este evento — es estándar del navegador (Chrome/Edge/Android), no de Angular. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Botón de "Instalar app" propio, en vez de depender solo del ícono que
 * Chrome muestra por su cuenta en la barra de direcciones.
 *
 * Ojo: `beforeinstallprompt` es Chrome/Edge/Android — Safari/iOS no lo dispara
 * nunca (no tiene prompt programático), ahí sigue siendo manual vía Compartir
 * → "Agregar a inicio" (las meta tags de iOS ya están en index.html).
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  canInstall = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    await this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
  }
}
