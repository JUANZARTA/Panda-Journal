import { ApplicationConfig, PLATFORM_ID, inject, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth, type Auth } from '@angular/fire/auth';
import { provideDatabase, getDatabase, type Database } from '@angular/fire/database';

import { routes } from './app.routes';
import { firebaseConfig } from '../environments/firebase-config';
import { CategoryRepository } from './data-access/repositories/category.repository';
import { FirebaseCategoryRepository } from './data-access/repositories/category.repository.firebase';
import { TaskRepository } from './data-access/repositories/task.repository';
import { FirebaseTaskRepository } from './data-access/repositories/task.repository.firebase';
import { provideServiceWorker } from '@angular/service-worker';

// Auth y Database tocan indexedDB/localStorage al inicializarse — en SSR (Node) eso
// no existe. Los guardamos con isPlatformBrowser para que el render de servidor no
// reviente; en el cliente, la hidratación los inicializa normalmente.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => (isPlatformBrowser(inject(PLATFORM_ID)) ? getAuth() : ({} as Auth))),
    provideDatabase(() => (isPlatformBrowser(inject(PLATFORM_ID)) ? getDatabase() : ({} as Database))),
    // Punto de swap: el día que exista backend (Spring Boot, como Kontrol Cash),
    // acá se cambia useClass por la implementación HTTP — nada más se toca.
    { provide: CategoryRepository, useClass: FirebaseCategoryRepository },
    { provide: TaskRepository, useClass: FirebaseTaskRepository },
    // registerWhenStable esperaba a que la zona de Angular quede sin tareas
    // pendientes — con los listeners de Firebase corriendo todo el tiempo, eso
    // puede tardar los 30s completos antes de activar el service worker (y sin
    // service worker activo, Chrome no dispara el evento de instalar). Con
    // 'registerImmediately' se registra apenas carga la app, sin esperar nada.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
  ],
};
