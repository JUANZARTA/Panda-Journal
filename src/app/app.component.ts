import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

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
  private cleanupAutoLogout: (() => void) | null = null;

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      window.history.replaceState({}, '', redirect);
      this.router.navigateByUrl(redirect);
    }

    // Inicializa auto-logout a nivel de app (persiste a través de navegación)
    this.cleanupAutoLogout = this.authService.startAutoLogout();
  }

  ngOnDestroy(): void {
    // Limpia listeners de inactividad si existen
    if (this.cleanupAutoLogout) {
      this.cleanupAutoLogout();
    }
  }
}
