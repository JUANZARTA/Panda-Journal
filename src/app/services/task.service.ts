// Orquesta el TaskRepository para el día seleccionado (DateService), la
// bandeja de tareas sin fecha ("Otras tareas") y la de tareas perdidas.
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { TaskRepository } from '../data-access/repositories/task.repository';
import { DateService, formatDate } from './date.service';
import { Task, TaskConFecha, TaskInput } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private repo = inject(TaskRepository);
  private dateService = inject(DateService);

  /** Tareas del día actualmente seleccionado — stream en vivo. */
  watchSelectedDayTasks(): Observable<Task[]> {
    return this.dateService.selectedDate$.pipe(switchMap((fecha) => this.repo.watchByDate(fecha)));
  }

  addTask(input: TaskInput): Observable<string> {
    return this.repo.create(this.dateService.getSelectedDate(), { ...input, nombre: input.nombre.trim() });
  }

  updateTask(taskId: string, changes: Partial<TaskInput>): Observable<void> {
    return this.repo.update(this.dateService.getSelectedDate(), taskId, changes);
  }

  removeTask(taskId: string): Observable<void> {
    return this.repo.remove(this.dateService.getSelectedDate(), taskId);
  }

  toggleEstado(task: Task): Observable<void> {
    return this.updateTask(task.id, { estado: task.estado === 'realizado' ? 'pendiente' : 'realizado' });
  }

  // -------- "Todas las tareas" --------
  // Estos reciben la fecha explícita: acá se muestran tareas de muchos días a la
  // vez, no se puede asumir "el día seleccionado en el Home" como en los métodos
  // de arriba.

  watchAllDatedTasks(): Observable<TaskConFecha[]> {
    return this.repo.watchAllDated();
  }

  toggleEstadoOnDate(task: Task, fecha: string): Observable<void> {
    return this.repo.update(fecha, task.id, {
      estado: task.estado === 'realizado' ? 'pendiente' : 'realizado',
    });
  }

  removeTaskOnDate(fecha: string, taskId: string): Observable<void> {
    return this.repo.remove(fecha, taskId);
  }

  moveTaskToDate(task: Task, fechaActual: string, fechaNueva: string): Observable<void> {
    return this.repo.moveToDate(task, fechaActual, fechaNueva);
  }

  // -------- "Otras tareas" (sin fecha) --------

  watchUndatedTasks(): Observable<Task[]> {
    return this.repo.watchUndated();
  }

  addUndatedTask(input: TaskInput): Observable<string> {
    return this.repo.createUndated({ ...input, nombre: input.nombre.trim() });
  }

  removeUndatedTask(taskId: string): Observable<void> {
    return this.repo.removeUndated(taskId);
  }

  toggleUndatedEstado(task: Task): Observable<void> {
    return this.repo.updateUndated(task.id, {
      estado: task.estado === 'realizado' ? 'pendiente' : 'realizado',
    });
  }

  /** Le pone fecha a una tarea de "Otras tareas" — se muda a la página de ese día. */
  assignDate(task: Task, fecha: string): Observable<void> {
    return this.repo.assignDate(task, fecha);
  }

  // -------- Tareas perdidas --------

  watchLostTasks(): Observable<Task[]> {
    return this.repo.watchLost();
  }

  removeLostTask(taskId: string): Observable<void> {
    return this.repo.removeLost(taskId);
  }

  toggleLostEstado(task: Task): Observable<void> {
    return this.repo.updateLost(task.id, {
      estado: task.estado === 'realizado' ? 'pendiente' : 'realizado',
    });
  }

  /** Reasigna una tarea perdida a una fecha nueva — vuelve a la página de ese día. */
  reassignLost(task: Task, fecha: string): Observable<void> {
    return this.repo.reassignLost(task, fecha);
  }

  /** Se llama una vez al abrir la app (ver LayoutComponent) — migra lo vencido a "Tareas perdidas". */
  migratePastDueTasks(): Observable<void> {
    return this.repo.migratePastDue(formatDate(new Date()));
  }
}
