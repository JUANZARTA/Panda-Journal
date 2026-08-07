import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Arma los paths de Firebase. v3: las categorías son a nivel usuario (viven
 * siempre, no se recrean por mes) y las tareas se indexan por fecha exacta —
 * $uid/categorias/{id} y $uid/tareas/{fecha}/{taskId}.
 */
@Injectable({ providedIn: 'root' })
export class PeriodPathService {
  private authService = inject(AuthService);

  uid(): string | null {
    return this.authService.getUser()?.id ?? null;
  }

  categoriesPath(): string | null {
    const uid = this.uid();
    return uid ? `${uid}/categorias` : null;
  }

  tasksForDatePath(fecha: string): string | null {
    const uid = this.uid();
    return uid && fecha ? `${uid}/tareas/${fecha}` : null;
  }

  /** Bandeja de tareas sin fecha asignada todavía (por categoría, no por día). */
  undatedTasksPath(): string | null {
    const uid = this.uid();
    return uid ? `${uid}/tareas_sin_fecha` : null;
  }

  /** Raíz del árbol de tareas por fecha — para la query de "días anteriores a hoy". */
  tasksRootPath(): string | null {
    const uid = this.uid();
    return uid ? `${uid}/tareas` : null;
  }

  /** Bandeja de tareas que quedaron sin completar en un día que ya pasó. */
  lostTasksPath(): string | null {
    const uid = this.uid();
    return uid ? `${uid}/tareas_perdidas` : null;
  }
}
