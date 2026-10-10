import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref } from '@angular/fire/database';
import { watchValue } from '../data-access/watch-value';

/** Estado de conexión con Firebase. `.info/connected` arranca en false hasta conectar, por eso se ignora ese primer false. */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private db = inject(Database);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly offline = signal(false);

  private yaConecto = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!this.isBrowser) return;

    watchValue<boolean>(ref(this.db, '.info/connected')).subscribe((conectado) => {
      if (this.timer) clearTimeout(this.timer);
      if (conectado) {
        this.yaConecto = true;
        this.offline.set(false);
        return;
      }
      // Pequeña espera para no parpadear en cortes de un segundo o mientras arranca.
      this.timer = setTimeout(() => this.offline.set(true), this.yaConecto ? 1500 : 5000);
    });
  }
}
