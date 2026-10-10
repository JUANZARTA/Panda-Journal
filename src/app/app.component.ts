import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AuthService } from './services/auth.service';
import { BiometricService } from './core/biometric.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Mis Deberes';
  private router = inject(Router);
  private authService = inject(AuthService);
  private swUpdate = inject(SwUpdate);
  // Instanciado al arrancar: el bloqueo solo aplica si ya había sesión al abrir la app, no tras un login con contraseña.
  private biometric = inject(BiometricService);
  private cleanupAutoLogout: (() => void) | null = null;

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      window.history.replaceState({}, '', redirect);
      this.router.navigateByUrl(redirect);
    }

    this.recoverFromStaleDeploy();

    // Inicializa auto-logout a nivel de app (persiste a través de navegación)
    this.cleanupAutoLogout = this.authService.startAutoLogout();
  }

  // Un deploy nuevo borra los chunks hasheados viejos; el SW sirve el index viejo y la app queda en blanco.
  private recoverFromStaleDeploy(): void {
    const reload = () => {
      try {
        if (sessionStorage.getItem('stale-reload')) return;
        sessionStorage.setItem('stale-reload', '1');
      } catch {}
      window.location.reload();
    };

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') reload();
        if (e.type === 'VERSION_INSTALLATION_FAILED') this.swUpdate.checkForUpdate().catch(() => {});
      });
      this.swUpdate.unrecoverable.subscribe(() => reload());
      this.swUpdate.checkForUpdate().catch(() => {});
    }

    window.addEventListener('unhandledrejection', (ev) => {
      const msg = String(ev.reason?.message ?? ev.reason ?? '');
      if (/Loading chunk|ChunkLoadError|dynamically imported module/i.test(msg)) reload();
    });
    setTimeout(() => {
      try { sessionStorage.removeItem('stale-reload'); } catch {}
    }, 10000);
  }

  ngOnDestroy(): void {
    // Limpia listeners de inactividad si existen
    if (this.cleanupAutoLogout) {
      this.cleanupAutoLogout();
    }
  }
}
