import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map, tap } from 'rxjs';

import { RecurringTaskRepository } from '../data-access/repositories/recurring-task.repository';
import { TaskRepository } from '../data-access/repositories/task.repository';
import { RecurringTask } from '../models/recurring-task.model';
import { DateService, formatDate } from './date.service';

@Injectable({ providedIn: 'root' })
export class RecurringTaskService {
  private recurringRepo = inject(RecurringTaskRepository);
  private taskRepo = inject(TaskRepository);
  private dateService = inject(DateService);

  getAll(): Observable<RecurringTask[]> {
    return this.recurringRepo.getAll();
  }

  create(nombre: string, categoriaId: string): Observable<RecurringTask> {
    return this.recurringRepo.create({
      nombre,
      categoriaId,
      activo: true,
    });
  }

  updateNombre(id: string, nombre: string): Observable<void> {
    return this.recurringRepo.update(id, { nombre });
  }

  updateCategoria(id: string, categoriaId: string): Observable<void> {
    return this.recurringRepo.update(id, { categoriaId });
  }

  toggleActive(id: string, activo: boolean): Observable<void> {
    return this.recurringRepo.toggleActive(id, activo);
  }

  delete(id: string): Observable<void> {
    return this.recurringRepo.delete(id);
  }

  /**
   * Genera todas las tareas recurrentes activas para HOY.
   * EJECUTA UNA SOLA VEZ POR DÍA — usa localStorage para guardar la última ejecución.
   */
  generateTodayRecurringTasks(): Observable<void> {
    const today = formatDate(new Date());
    const storageKey = 'recurring_tasks_generated_date';

    // Verifica si ya se ejecutó hoy
    try {
      const lastGenerated = localStorage.getItem(storageKey);
      if (lastGenerated === today) {
        // Ya se ejecutó hoy — no hacer nada
        return from([undefined]);
      }
    } catch (err) {
      // localStorage no disponible (SSR) — continuar
    }

    return this.recurringRepo.getActive().pipe(
      switchMap((recurringTasks) => {
        if (recurringTasks.length === 0) return from([undefined]);

        return this.taskRepo.watchByDate(today).pipe(
          map((existingTasks) => {
            // Solo crea si NO existe tarea con igual nombre + categoría
            return recurringTasks.filter((recurring) => {
              const alreadyExists = existingTasks.some(
                (task) =>
                  task.nombre.trim().toLowerCase() === recurring.nombre.trim().toLowerCase() &&
                  task.categoriaId === recurring.categoriaId
              );
              // Si ya existe → no crear
              if (alreadyExists) return false;
              return true;
            });
          }),
          switchMap((tasksToCreate) => {
            // Crea todas las que no existen
            if (tasksToCreate.length === 0) return from([undefined]);

            const creates = tasksToCreate.map((recurring) =>
              this.taskRepo.create(today, {
                nombre: recurring.nombre,
                categoriaId: recurring.categoriaId,
                estado: 'pendiente',
              })
            );

            return from(Promise.all(creates)).pipe(
              tap(() => {
                // Marca que se ejecutó hoy
                try {
                  localStorage.setItem(storageKey, today);
                } catch (err) {
                  // localStorage no disponible
                }
              }),
              map(() => undefined)
            );
          })
        );
      })
    );
  }
}
