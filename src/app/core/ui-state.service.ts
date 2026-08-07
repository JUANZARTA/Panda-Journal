import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Estado de UI transversal: drawer (mobile) y modo oscuro. Antes vivía disperso en HeaderComponent. */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  isDrawerOpen = signal(false);
  isDarkMode = signal(this.isBrowser ? localStorage.getItem('darkMode') === 'true' : false);

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      document.documentElement.classList.toggle('dark', this.isDarkMode());
      localStorage.setItem('darkMode', String(this.isDarkMode()));
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode.update((v) => !v);
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }
}
