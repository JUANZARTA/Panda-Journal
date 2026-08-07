// Autenticación real con Firebase Auth (SDK modular vía AngularFire) — antes este
// servicio le pegaba a mano al REST de identitytoolkit y guardaba el perfil/las
// notificaciones con HttpClient directo contra la URL de la RTDB, sin adjuntar
// ningún token. Con el SDK real, cada operación de Database queda autenticada
// automáticamente contra el usuario logueado (siempre que las Security Rules del
// proyecto lo exijan — auditarlas es un paso aparte, no alcanza con este cambio).
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, from, of, forkJoin, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult as fbGetRedirectResult,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from '@angular/fire/auth';
import {
  Database,
  ref,
  get,
  set,
  update as dbUpdate,
  remove as dbRemove,
  push,
} from '@angular/fire/database';

export interface Notificacion {
  mensaje: string;
  leido: boolean;
  fecha: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private database = inject(Database);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ==================
  // Sesión
  // ==================

  login(email: string, password: string): Observable<{ localId: string; email: string }> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map((cred) => this.persistSession(cred)),
      catchError((err) => throwError(() => this.mapAuthErrorCode(err?.code)))
    );
  }

  register(email: string, password: string): Observable<{ localId: string; email: string }> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      map((cred) => this.persistSession(cred)),
      catchError((err) => throwError(() => this.mapAuthErrorCode(err?.code)))
    );
  }

  logout(): void {
    signOut(this.auth).catch((err) => console.error('[ERROR] Al cerrar sesión:', err));
    if (!this.isBrowser) return;
    localStorage.removeItem('user');
    localStorage.removeItem('selectedYear');
    localStorage.removeItem('selectedMonth');
  }

  isLoggedIn(): boolean {
    return this.isBrowser && !!localStorage.getItem('user');
  }

  getUser(): { id: string; email: string } | null {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem('user');
    if (!data) return null;
    return JSON.parse(data);
  }

  guardarSesion(userId: string, email: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem('user', JSON.stringify({ id: userId, email }));
  }

  loginWithGoogle(): void {
    signInWithRedirect(this.auth, new GoogleAuthProvider());
  }

  getRedirectResult(): Promise<UserCredential | null> {
    return fbGetRedirectResult(this.auth);
  }

  startAutoLogout(): void {
    if (!this.isBrowser) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.logout();
        window.location.href = `${document.baseURI}login`;
      }, 5 * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();
  }

  // ==================
  // Perfil
  // ==================

  saveUserProfile(userId: string, name: string, correo: string): Observable<void> {
    return from(set(ref(this.database, userId), { nombre: name, correo })).pipe(
      switchMap(() => {
        const notifRef = push(ref(this.database, `${userId}/notificaciones`));
        return from(
          set(notifRef, {
            mensaje: 'Bienvenido a Panda Journal',
            leido: false,
            fecha: new Date().toLocaleString(),
          })
        );
      }),
      tap(() => {
        if (!this.isBrowser) return;
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.name = name;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }),
      catchError(() => throwError(() => 'Error al guardar perfil'))
    );
  }

  getUserData(uid: string): Observable<any> {
    return from(get(ref(this.database, uid))).pipe(map((snap) => snap.val()));
  }

  // ==================
  // Notificaciones (persistidas — distinto del NotificacionService en memoria del header)
  // ==================

  getUserNotifications(uid: string): Observable<Record<string, Notificacion>> {
    return from(get(ref(this.database, `${uid}/notificaciones`))).pipe(map((snap) => snap.val() ?? {}));
  }

  markNotificationAsRead(uid: string, notifId: string): Observable<void> {
    return from(dbUpdate(ref(this.database, `${uid}/notificaciones/${notifId}`), { leido: true }));
  }

  addNotification(uid: string, mensaje: string): Observable<void> {
    const notificacionesPath = `${uid}/notificaciones`;
    const crear = () => {
      const nuevaRef = push(ref(this.database, notificacionesPath));
      return from(set(nuevaRef, { mensaje, leido: false, fecha: new Date().toLocaleString() }));
    };

    return this.getUserNotifications(uid).pipe(
      switchMap((data) => {
        const entradas = Object.entries(data);
        if (entradas.length < 20) return crear();

        const [oldestKey] = entradas.sort(
          (a, b) => new Date(a[1].fecha).getTime() - new Date(b[1].fecha).getTime()
        )[0];

        return from(dbRemove(ref(this.database, `${notificacionesPath}/${oldestKey}`))).pipe(
          switchMap(crear)
        );
      })
    );
  }

  cleanOldNotifications(uid: string): Observable<void[] | null> {
    return this.getUserNotifications(uid).pipe(
      switchMap((data) => {
        const ahora = new Date();
        const aBorrar = Object.entries(data ?? {}).filter(([, notif]) => {
          const fecha = new Date(notif.fecha);
          const diasTranscurridos = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
          return diasTranscurridos >= 7;
        });

        if (aBorrar.length === 0) return of(null);

        return forkJoin(
          aBorrar.map(([key]) => from(dbRemove(ref(this.database, `${uid}/notificaciones/${key}`))))
        );
      })
    );
  }

  // ==================
  // Internos
  // ==================

  private persistSession(cred: UserCredential): { localId: string; email: string } {
    const result = { localId: cred.user.uid, email: cred.user.email ?? '' };
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify({ id: result.localId, email: result.email }));
    }
    return result;
  }

  /** Traduce los códigos del SDK modular a los strings que ya esperan los componentes de login/register. */
  private mapAuthErrorCode(code?: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'EMAIL_NOT_FOUND';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'INVALID_PASSWORD';
      case 'auth/user-disabled':
        return 'USER_DISABLED';
      case 'auth/email-already-in-use':
        return 'EMAIL_EXISTS';
      default:
        return code ?? 'UNKNOWN_ERROR';
    }
  }
}
