import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DateService } from '../../services/date.service';
import { PwaInstallService } from '../../core/pwa-install.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private dateService = inject(DateService);
  pwaInstall = inject(PwaInstallService);
  showPassword: boolean = false;

  loginForm: FormGroup;
  showModal = false;
  showSuccessModal = false;
  errorMessage = '';
  welcomeName: string = '';

  // Estado machine para overlay spinner
  showLoginOverlay = false;
  loginSuccess = false;
  loginError = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

// Método para capturar el resultado del login con Google y redirigir si es nuevo login
ngOnInit(): void {
  this.authService
    .getRedirectResult()
    .then((result) => {
      if (result?.user) {
        // Verificar que la sesión fue persistida en localStorage
        const persistedUser = this.authService.getUser();
        if (persistedUser) {
          this.welcomeName = result.user.displayName || 'Usuario';
          this.showSuccessModal = true;

          setTimeout(() => {
            this.router.navigate(['app/home']);
          }, 1000);
        } else {
          console.error('[ERROR] Session no fue persistida en localStorage');
          this.showErrorModal('Error al guardar sesión. Intenta de nuevo.');
        }
      }
    })
    .catch((error) => {
      console.error('[ERROR] En getRedirectResult:', error);
      this.showErrorModal('Error en autenticación con Google. Intenta de nuevo.');
    });
}


  isInvalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.loginForm.valid) {
      // Mostrar overlay antes de iniciar login
      this.showLoginOverlay = true;
      this.loginSuccess = false;
      this.loginError = false; // Reset error

      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (res) => {
          const uid = res.localId;
          this.loginSuccess = true; // Indica éxito

          this.authService.getUserData(uid).subscribe((userData) => {
            const nombre = userData?.nombre || '';
            this.showWelcomeModal(nombre);

            // Cerrar overlay después de 1.5s
            setTimeout(() => {
              this.showLoginOverlay = false;
            }, 1500);
          });
        },
        error: (errorMsg) => {
          this.loginSuccess = false;
          this.loginError = true; // Indica error
          this.showLoginOverlay = true; // Mantener overlay para mostrar error

          // Ocultar overlay automáticamente después de 2s
          setTimeout(() => {
            this.showLoginOverlay = false;
          }, 2000);

          // Mostrar mensaje de error detallado
          this.showErrorModal(this.getFirebaseErrorMessage(errorMsg));
        },
      });
    }
  }

  showErrorModal(message: string) {
    this.errorMessage = message;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  showWelcomeModal(nombre: string) {
    this.welcomeName = nombre;
    this.showSuccessModal = true;

    this.dateService.goToToday();

    setTimeout(() => {
      this.showSuccessModal = false;
      this.router.navigate(['app/home']);
    }, 1000);
  }

  private getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'EMAIL_NOT_FOUND':
      case 'INVALID_PASSWORD':
        return 'Correo o contraseña incorrectos.';
      case 'USER_DISABLED':
        return 'Este usuario ha sido deshabilitado.';
      default:
        return 'Ha ocurrido un error inesperado.';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Método para iniciar sesión con Google
  onLoginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}

