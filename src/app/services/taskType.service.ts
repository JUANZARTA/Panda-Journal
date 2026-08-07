// Servicio de categorías ("tipos de tarea"). Orquesta el CategoryRepository —
// ya no le pega directo a Firebase por REST, y ya no arma keys a partir del
// nombre (eso generaba colisiones cuando dos categorías tenían el mismo nombre).
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRepository } from '../data-access/repositories/category.repository';
import { TaskType } from '../models/taskType.model';

@Injectable({ providedIn: 'root' })
export class TaskTypeService {
  private repo = inject(CategoryRepository);

  /** Stream en vivo — se actualiza solo cuando cambian las categorías, sin volver a pedir. */
  getAllTaskTypes(): Observable<TaskType[]> {
    return this.repo.watchAll();
  }

  addTaskType(nombre: string): Observable<string> {
    return this.repo.create(nombre);
  }

  editTaskType(id: string, nuevoNombre: string): Observable<void> {
    return this.repo.rename(id, nuevoNombre);
  }

  deleteTaskType(id: string): Observable<void> {
    return this.repo.remove(id);
  }
}
