import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ACCENT_THEMES, UiStateService } from '../../core/ui-state.service';
import { BiometricService } from '../../core/biometric.service';
import { AuthService } from '../../services/auth.service';
import { CHANGELOG, ChangelogEntry } from '../../core/changelog';
import { APP_VERSION } from '../../core/version';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export default class SettingsComponent implements OnInit {
  uiState = inject(UiStateService);
  biometric = inject(BiometricService);
  private authService = inject(AuthService);

  themes = ACCENT_THEMES;
  changelog = CHANGELOG;
  version = APP_VERSION;

  biometricSupported = signal(false);
  biometricBusy = signal(false);
  notaAbierta = signal<ChangelogEntry | null>(null);

  @HostListener('document:keydown.escape')
  cerrarNota(): void {
    this.notaAbierta.set(null);
  }

  ngOnInit(): void {
    this.biometric.isSupported().then((ok) => this.biometricSupported.set(ok));
  }

  async toggleBiometric(): Promise<void> {
    if (this.biometricBusy()) return;
    if (this.biometric.enabled()) {
      this.biometric.disable();
      return;
    }
    const uid = this.authService.getUser()?.id;
    if (!uid) return;
    this.biometricBusy.set(true);
    try {
      await this.biometric.enable(uid);
    } catch {
      // el mensaje queda en biometric.error()
    } finally {
      this.biometricBusy.set(false);
    }
  }
}
