import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, take } from 'rxjs';

import { UiStateService } from '../../../core/ui-state.service';
import { PwaInstallService } from '../../../core/pwa-install.service';
import { AuthService } from '../../../services/auth.service';
import { NotificacionService } from '../../../services/notificacion.service';
import { TaskService } from '../../../services/task.service';
import { TaskTypeService } from '../../../services/taskType.service';
import { Task } from '../../../models/task.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  uiState = inject(UiStateService);
  pwaInstall = inject(PwaInstallService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificacionService = inject(NotificacionService);
  private taskService = inject(TaskService);
  private taskTypeService = inject(TaskTypeService);

  private tareasPerdidas = toSignal(this.taskService.watchLostTasks(), { initialValue: [] as Task[] });
  lostCount = computed(() => this.tareasPerdidas().filter((t) => t.estado !== 'realizado').length);

  @ViewChild('notifDropdown') notifDropdownRef: ElementRef | undefined;

  showNotifications = false;
  notifications: any[] = [];
  unreadCount = 0;

  ngOnInit(): void {
    // Notificaciones desactivadas: estaban generando avisos incorrectos (ej. en
    // cuentas recién creadas, sin tareas todavía). Queda el código de abajo por
    // si se retoma más adelante, pero no se llama a nada acá.
  }

  navigate(path: string): void {
    this.uiState.closeDrawer();
    this.router.navigate([path]);
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = this.notifDropdownRef?.nativeElement.contains(target);
    const clickedToggle = target.closest('[data-toggle-notif]');
    if (!clickedInside && !clickedToggle) this.showNotifications = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  markAsRead(notifId: string): void {
    const uid = this.authService.getUser()?.id;
    if (!uid) return;

    this.authService.markNotificationAsRead(uid, notifId).subscribe(() => {
      this.notifications = this.notifications.map((n) => (n.id === notifId ? { ...n, leido: true } : n));
      this.unreadCount = this.notifications.filter((n) => !n.leido).length;
    });
  }

  private syncNotificacionesLocales(): void {
    this.notifications = this.notificacionService.getAll();
    this.unreadCount = this.notificacionService.getUnreadCount();
  }

  private loadPersistedNotifications(): void {
    const uid = this.authService.getUser()?.id;
    if (!uid) return;

    this.authService.getUserNotifications(uid).subscribe((data) => {
      if (!data) return;
      this.notifications = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      this.unreadCount = this.notifications.filter((n) => !n.leido).length;
    });
  }

  private checkTareasDelDia(): void {
    combineLatest([
      this.taskService.watchSelectedDayTasks().pipe(take(1)),
      this.taskTypeService.getAllTaskTypes().pipe(take(1)),
    ]).subscribe(([tareas, categorias]) => {
      const nombrePorCategoriaId = new Map(categorias.map((c) => [c.id, c.nombre]));
      const pendientesPorCategoria: Record<string, number> = {};

      tareas.forEach((t) => {
        if (t.estado !== 'realizado') {
          pendientesPorCategoria[t.categoriaId] = (pendientesPorCategoria[t.categoriaId] || 0) + 1;
        }
      });

      for (const categoriaId in pendientesPorCategoria) {
        const nombre = nombrePorCategoriaId.get(categoriaId) ?? 'sin categoría';
        this.notificacionService.add(
          `Tenés ${pendientesPorCategoria[categoriaId]} tareas pendientes hoy en "${nombre}".`
        );
      }

      this.syncNotificacionesLocales();
    });
  }
}
