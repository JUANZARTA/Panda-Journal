import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // 👈 Importa tu guard
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component')
  },
  {
    path: 'app',
    canActivate: [AuthGuard], // ✅ Aquí aplicas el guard a TODA la sección protegida
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.component') },
      { path: 'categorias', loadComponent: () => import('./pages/categories/categories.component') },
      { path: 'otras-tareas', loadComponent: () => import('./pages/otras-tareas/otras-tareas.component') },
      { path: 'tareas-perdidas', loadComponent: () => import('./pages/tareas-perdidas/tareas-perdidas.component') },
      { path: 'todas-las-tareas', loadComponent: () => import('./pages/todas-las-tareas/todas-las-tareas.component') },
      { path: 'itinerario', loadComponent: () => import('./pages/itinerario/itinerario.component').then(m => m.ItinerarioComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
