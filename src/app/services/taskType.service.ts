// Servicio de categorías ("tipos de tarea"). Orquesta el CategoryRepository —
// ya no le pega directo a Firebase por REST, y ya no arma keys a partir del
// nombre (eso generaba colisiones cuando dos categorías tenían el mismo nombre).
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../data-access/repositories/category.repository';
import { TaskService } from './task.service';
import { TaskType } from '../models/taskType.model';
import { formatDate } from './date.service';

@Injectable({ providedIn: 'root' })
export class TaskTypeService {
  private repo = inject(CategoryRepository);
  private taskService = inject(TaskService);

  /** Stream en vivo — se actualiza solo cuando cambian las categorías, sin volver a pedir. */
  getAllTaskTypes(): Observable<TaskType[]> {
    return this.repo.watchAll();
  }

  addTaskType(nombre: string): Observable<string> {
    return this.repo.create(nombre);
  }

  editTaskType(id: string, nuevoNombre: string, activa?: boolean): Observable<void> {
    return activa !== undefined ? this.repo.update(id, { nombre: nuevoNombre, activa }) : this.repo.rename(id, nuevoNombre);
  }

  /**
   * Activa/desactiva una categoría. Al desactivar guarda la fecha de hoy (local) en
   * desactivadaDesde; al activar la borra. No toca ninguna tarea.
   */
  setActiva(id: string, activa: boolean): Observable<void> {
    return this.repo.update(id, { activa, desactivadaDesde: activa ? null : formatDate(new Date()) });
  }

  /** ¿Se pueden crear/editar/borrar/tildar/mover tareas de esta categoría? Una categoría inexistente no bloquea. */
  categoriaEditable(cat: TaskType | undefined | null): boolean {
    return !cat || cat.activa === undefined || cat.activa === true;
  }

  /**
   * ¿Se muestra la sección de la categoría en el cuaderno de la fecha (YYYY-MM-DD)?
   * Activa: siempre. Desactivada: solo en fechas anteriores a desactivadaDesde (en solo lectura).
   * Sin desactivadaDesde (dato viejo) se muestra siempre, para no ocultar historial.
   */
  categoriaVisibleEnCuaderno(cat: TaskType | undefined | null, fecha: string): boolean {
    if (this.categoriaEditable(cat)) return true;
    const desde = cat?.desactivadaDesde;
    return !desde || fecha < desde;
  }

  deleteTaskType(id: string): Observable<void> {
    return this.repo.remove(id);
  }

  updateOrder(id: string, orden: number): Observable<void> {
    return this.repo.update(id, { orden });
  }
}
