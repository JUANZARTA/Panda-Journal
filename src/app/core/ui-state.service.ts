import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AccentTheme = 'gold' | 'blue' | 'rose';

export const ACCENT_THEMES: { id: AccentTheme; nombre: string; color: string }[] = [
  { id: 'gold', nombre: 'Dorado', color: '#b8860b' },
  { id: 'blue', nombre: 'Azul', color: '#1f6feb' },
  { id: 'rose', nombre: 'Rosa', color: '#b5338a' },
];

/** Estado de UI transversal: drawer (mobile), modo oscuro y color de acento. */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  isDrawerOpen = signal(false);
  isDarkMode = signal(this.isBrowser ? localStorage.getItem('darkMode') === 'true' : false);
  isSidebarCollapsed = signal(this.isBrowser ? localStorage.getItem('sidebar-collapsed') === 'true' : false);
  accentTheme = signal<AccentTheme>(this.readAccentTheme());

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      document.documentElement.classList.toggle('dark', this.isDarkMode());
      localStorage.setItem('darkMode', String(this.isDarkMode()));
    });

    effect(() => {
      if (!this.isBrowser) return;
      const theme = this.accentTheme();
      const root = document.documentElement;
      root.classList.toggle('theme-blue', theme === 'blue');
      root.classList.toggle('theme-rose', theme === 'rose');
      localStorage.setItem('accentTheme', theme);
      const color = ACCENT_THEMES.find((t) => t.id === theme)?.color;
      if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode.update((v) => !v);
  }

  cycleAccentTheme(): void {
    const i = ACCENT_THEMES.findIndex((t) => t.id === this.accentTheme());
    this.accentTheme.set(ACCENT_THEMES[(i + 1) % ACCENT_THEMES.length].id);
  }

  accentThemeInfo() {
    return ACCENT_THEMES.find((t) => t.id === this.accentTheme()) ?? ACCENT_THEMES[0];
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

  private readAccentTheme(): AccentTheme {
    if (!this.isBrowser) return 'gold';
    const stored = localStorage.getItem('accentTheme');
    return stored === 'blue' || stored === 'rose' ? stored : 'gold';
  }
}
